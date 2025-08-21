import cv2
import json
import time
import struct
import base64
import asyncio
from datetime import datetime
import numpy as np
from queue import Empty
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, File, UploadFile
from app.dependencies import (
    get_stt_recorder,
    get_chat_session,
    get_conversation_manager,
    get_liveness_dependencies,
    get_face_processor,
)
from app.services import ChatSession, ConversationManager, FaceProcessor
from app.core import MAX_AUDIO_QUEUE_SIZE
from app.models import DriverCardSecurityCheck


router = APIRouter()


def format_timestamp_ns(timestamp_ns: int) -> str:
    """
    Formats a nanosecond timestamp into a human-readable HH:MM:SS.fff string.

    Args:
        timestamp_ns: The timestamp in nanoseconds since the epoch.

    Returns:
        A string formatted as hours:minutes:seconds.milliseconds.
    """
    # Split into whole seconds and the nanosecond remainder
    seconds = timestamp_ns // 1_000_000_000
    remainder_ns = timestamp_ns % 1_000_000_000

    # Convert seconds part into a datetime object (local time)
    dt = datetime.fromtimestamp(seconds)

    # Format the main time as HH:MM:SS
    time_str = dt.strftime("%H:%M:%S")

    # For instance, if you want milliseconds, divide the remainder by 1e6 and format as 3-digit
    milliseconds = remainder_ns // 1_000_000
    formatted_timestamp = f"{time_str}.{milliseconds:03d}"

    return formatted_timestamp


def parse_json_message(text: str) -> dict:
    """
    Safely parses a JSON string into a dictionary.

    Logs a warning if the JSON is invalid and returns an empty dictionary.

    Args:
        text: The JSON string to parse.

    Returns:
        A dictionary representing the parsed JSON, or an empty dictionary on error.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        print(f"WebSocket: Invalid JSON received: {text}")
        return {}


async def process_incoming_data(ws: WebSocket, session: ChatSession):
    """
    Receives messages via WebSocket, processes audio and text messages.

    Handles binary audio chunks, extracting metadata (timestamp, flags) and
    putting the audio PCM data with metadata into the `incoming_chunks` queue.
    Applies back-pressure if the queue is full.
    Parses text messages (assumed JSON) and triggers actions based on message type
    (e.g., updates client TTS state via `callbacks`, clears history, sets speed).

    Args:
        ws: The WebSocket connection instance.
        session: The chat session instance containing queues and callbacks.
    """
    try:
        while True:
            event_handler = session.synthesizer_manager.llm.event_handler
            msg = await ws.receive()

            if "bytes" in msg and msg["bytes"]:
                raw = msg["bytes"]

                if len(raw) < 8:
                    print("WebSocket: Received invalid audio chunk, skipping.")
                    continue

                # Unpack big-endian 64-bit integer for timestamp and flags
                timestamp_ms, flags = struct.unpack("!II", raw[:8])
                client_sent_ns = timestamp_ms * 1_000_000

                # Build metadata
                metadata = {
                    "client_sent_ms": timestamp_ms,
                    "client_sent": client_sent_ns,
                    "client_sent_formatted": format_timestamp_ns(client_sent_ns),
                    "isTTSPlaying": bool(flags & 1),
                }

                # Record server receive time
                server_ns = time.time_ns()
                metadata["server_received"] = server_ns
                metadata["server_received_formatted"] = format_timestamp_ns(server_ns)

                metadata["pcm"] = raw[8:]  # Extract PCM data after the first 8 bytes

                # Check queue size before putting data
                current_qsize = session.audio_chunks.qsize()

                # Only put if queue is not full and do security check is not set and not generating
                if current_qsize < MAX_AUDIO_QUEUE_SIZE:
                    if (
                        # not event_handler.do_security_check.is_set()
                        # not session.synthesizer_manager.tts_final_generation_active
                        # and not session.synthesizer_manager.llm_generation_active
                        # and not session.tts_to_client
                        not session.tts_client_playing
                        and session.message_queue.empty()  # If not sending any text or audio chunks
                        and not session.tts_chunk_sent
                    ):
                        await session.audio_chunks.put(metadata)
                    else:
                        # print(
                        #     f"WebSocket: Audio chunk received while security check is active or generation is already running. Ignoring."
                        # )  # Can be annoying, so we commented out
                        # After a certain time, the print should stop (30 seconds as set in the security node)
                        pass
                else:
                    # Queue is full, apply back-pressure
                    print(
                        f"WebSocket: Audio queue is full ({current_qsize}), applying back-pressure."
                    )

            elif "text" in msg and msg["text"]:
                # Text-based message: parse JSON
                data = parse_json_message(msg["text"])
                msg_type = data.get("type")

                if msg_type == "tts_start":
                    print("WebSocket: TTS start command received.")
                    session.tts_client_playing = True
                elif msg_type == "tts_stop":
                    session.tts_client_playing = False
                elif msg_type == "text_query":
                    # Forcibly process the text query
                    query = data.get("query", "")
                    if query:
                        # Only send if not doing security check and not generating
                        if (
                            # not event_handler.do_security_check.is_set()
                            # not session.synthesizer_manager.tts_final_generation_active
                            # and not session.synthesizer_manager.llm_generation_active
                            session.message_queue.empty()
                            and not session.tts_client_playing
                            # and not session.tts_to_client
                            and not session.tts_chunk_sent
                        ):
                            # Here we forcibly trigger the text query processing, as well as setting states using callbacks
                            # That are used automatically by the TTS client
                            session.final_transcription = ""  # Forcibly clear the final transcription so that on_final uses the new query
                            session.on_before_final(query)
                            session.on_final(query)
                        else:
                            # print(
                            #     "WebSocket: Text query received while security check is active or generation is already running. Ignoring."
                            # ) # Can be annoying, so we commented out
                            pass
                    else:
                        print("WebSocket: Empty text query received, ignoring.")

    except asyncio.CancelledError:
        pass  # Task was cancelled, no action needed
    except WebSocketDisconnect as e:
        print(f"WebSocket: Client disconnected - {e}")
    except RuntimeError as e:
        print(f"WebSocket: Runtime error occurred - {e}")
    except Exception as e:
        print(f"WebSocket: Unexpected error occurred - {e}")


async def send_text_messages(ws: WebSocket, message_queue: asyncio.Queue):
    """
    Continuously sends text messages from a queue to the client via WebSocket.

    Waits for messages on the `message_queue`, formats them as JSON, and sends
    them to the connected WebSocket client. Logs non-TTS messages.

    Args:
        ws: The WebSocket connection instance.
        message_queue: An asyncio queue yielding dictionaries to be sent as JSON.
    """
    try:
        while True:
            await asyncio.sleep(0.001)  # Yield control
            data = await message_queue.get()
            msg_type = data.get("type")

            if msg_type != "tts_chunk":
                print(
                    f"WebSocket: Sending message of type '{msg_type}' to client: {data}"
                )

            await ws.send_json(data)
    except asyncio.CancelledError:
        pass
    except WebSocketDisconnect as e:
        print(f"WebSocket: Client disconnected while sending text messages - {e}")
    except RuntimeError as e:
        print(f"WebSocket: Runtime error while sending text messages - {e}")
    except Exception as e:
        print(f"WebSocket: Unexpected error while sending text messages - {e}")


async def reset_interrupt_flag(session: ChatSession):
    """
    Resets the microphone interruption flag after a delay.

    Waits for 1 second, then checks if the AudioInputProcessor is still marked
    as interrupted. If so, resets the flag on both the processor and the
    connection-specific callbacks instance.

    Args:
        session: The chat session instance containing the AudioInputProcessor
                 and callbacks.
    """
    await asyncio.sleep(1)

    if session.transcriber_manager.interrupted:
        session.transcriber_manager.interrupted = False
        session.interruption_time = 0
        print("WebSocket: Resetting microphone interruption flag.")


async def send_tts_chunks(session: ChatSession):
    """
    Continuously sends TTS audio chunks from the session to the client.

    Monitors the state of the current speech generation (if any) and the client
    connection. Retrieves audio chunks from the active generation's
    queue, upsamples/encodes them, and puts them onto the outgoing `message_queue`
    for the client. Handles the end-of-generation logic and state resets.

    Args:
        session: The chat session instance containing the TTS client and queues.
    """
    try:
        print("WebSocket: Starting TTS chunk sender.")
        prev_status = None

        while True:
            await asyncio.sleep(0.001)  # Yield control

            if (
                session.transcriber_manager.interrupted
                and session.interruption_time
                and time.time() - session.interruption_time > 2.0
            ):
                session.transcriber_manager.interrupted = False
                session.interruption_time = 0
                print("WebSocket: Resetting microphone interruption flag after delay.")

            is_tts_finished = (
                session.synthesizer_manager.is_valid_gen()
                and session.synthesizer_manager.running_generation.audio_quick_finished
            )

            def log_status():
                nonlocal prev_status

                current_status = (
                    int(session.tts_to_client),
                    int(session.tts_client_playing),
                    int(session.tts_chunk_sent),
                    int(session.is_hot),
                    int(session.synthesis_started),
                    int(session.synthesizer_manager.running_generation is not None),
                    int(session.synthesizer_manager.is_valid_gen()),
                    int(is_tts_finished),
                    int(session.transcriber_manager.interrupted),
                )

                if current_status != prev_status:
                    print(
                        f"ToClient {current_status[0]}, "
                        f"ttsClientON {current_status[1]}, "  # Renamed slightly for clarity
                        f"ChunkSent {current_status[2]}, "
                        f"hot {current_status[3]}, synth {current_status[4]}"
                        f" gen {current_status[5]}"
                        f" valid {current_status[6]}"
                        f" tts_q_fin {current_status[7]}"
                        f" mic_inter {current_status[8]}"
                    )
                    prev_status = current_status

            if not session.tts_to_client:
                await asyncio.sleep(0.001)
                log_status()
                continue

            if not session.synthesizer_manager.running_generation:
                # No active TTS generation, wait for a new one
                await asyncio.sleep(0.001)
                log_status()
                continue

            if session.synthesizer_manager.running_generation.abortion_started:
                await asyncio.sleep(0.001)
                log_status()
                continue

            if (
                not session.synthesizer_manager.running_generation.quick_answer_first_chunk_ready
            ):
                await asyncio.sleep(0.001)
                log_status()
                continue

            chunk = None
            try:
                chunk = (
                    session.synthesizer_manager.running_generation.audio_chunks.get_nowait()
                )
                if chunk:
                    last_quick_answer_chunk = time.time()
            except Empty:
                final_expected = (
                    session.synthesizer_manager.running_generation.quick_answer_provided
                )
                audio_final_finished = (
                    session.synthesizer_manager.running_generation.audio_final_finished
                )

                if not final_expected or audio_final_finished:
                    print(
                        "WebSocket: Sending of TTS chunks and 'user request/assistant answer' cycle finished."
                    )
                    session.send_final_assistant_answer()  # This put the text chunks into message_queue

                    session.synthesizer_manager.running_generation = None

                    session.tts_chunk_sent = False  # Reset chunk sent flag
                    session.reset_state()  # Reset connection state

                await asyncio.sleep(0.001)
                log_status()
                continue

            base64_chunk = base64.b64encode(chunk).decode("utf-8")

            session.message_queue.put_nowait(
                {
                    "type": "tts_chunk",
                    "content": base64_chunk,
                }
            )

            last_chunk_sent = time.time()

            if not session.tts_chunk_sent:
                asyncio.create_task(reset_interrupt_flag(session))

            session.tts_chunk_sent = True

    except asyncio.CancelledError:
        pass
    except WebSocketDisconnect as e:
        print(f"WebSocket: Client disconnected while sending TTS chunks - {e}")
    except RuntimeError as e:
        print(f"WebSocket: Runtime error while sending TTS chunks - {e}")
    except Exception as e:
        print(f"WebSocket: Unexpected error while sending TTS chunks - {e}")


@router.websocket("/")
async def chat(ws: WebSocket):
    """
    Handle real-time voice chat and text-based interactions with the chatbot.

    Args:
        ws (WebSocket): The WebSocket connection for real-time communication.
    """
    await ws.accept()
    print("WebSocket: Client connected via WebSocket.")

    # Start the service
    session = get_chat_session()
    session.transcriber_manager.transcriber.recorder.clear_audio_queue()

    await asyncio.sleep(0.1)

    # Create tasks for handling different responsibilities
    # Pass the 'callbacks' instance to tasks that need connection-specific state
    audio_chunks, message_queue = session.get_queues()

    tasks = [
        asyncio.create_task(process_incoming_data(ws, session)),  # Pass session
        asyncio.create_task(send_text_messages(ws, message_queue)),
        asyncio.create_task(send_tts_chunks(session)),  # Pass session
        asyncio.create_task(get_stt_recorder().process_chunk_queue(audio_chunks)),
    ]

    try:
        # Wait for any task to complete (e.g., client disconnect)
        _, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            if not task.done():
                task.cancel()

        # Await cancelled tasks to let them clean up if needed
        await asyncio.gather(*pending, return_exceptions=True)

    except Exception as e:
        print(f"WebSocket: Error occurred - {e}")
    finally:
        print("WebSocket: Closing connection. Cleaning up resources.")

        for task in tasks:
            if not task.done():
                task.cancel()

        # Ensure all tasks are awaited after cancellation
        # Use return_exceptions=True to prevent gather from stopping on first error during cleanup
        await asyncio.gather(*tasks, return_exceptions=True)

        session.tts_client_playing = False

        # If currently doing security check, send a message to stop the check
        event_handler = session.synthesizer_manager.llm.event_handler
        if event_handler.do_security_check.is_set():
            event_handler.set_security_check_results(cancel=True)

        # Should also clear STT
        session.transcriber_manager.transcriber.recorder.abort()

        # Reset states ensure the next time websocket opens it starts fresh
        session.reset_state()
        session.clear_queues()
        session.transcriber_manager.interrupted = False

        # Clear the chat history
        manager = get_conversation_manager()
        manager.clear_memory()

        print("WebSocket: Connection closed and resources cleaned up.")


@router.get("/memory/")
async def get_memory():
    """
    Retrieve the conversation memory.

    Returns:
        BaseMessages: The conversation history as a list of messages.
    """
    manager = get_conversation_manager()
    messages = await manager.chat_history.aget_messages()
    return messages


@router.post("/memory/")
async def clear_memory():
    """
    Clear the conversation memory.
    This endpoint is used to reset the conversation history.
    """
    manager = get_conversation_manager()
    try:
        manager.clear_memory()
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error: {str(e)}"}
    return {"status": "success", "message": "Conversation memory cleared."}


@router.post("/security/")
async def do_security_check(
    visitor_data: DriverCardSecurityCheck,
    manager: ConversationManager = Depends(get_conversation_manager),
):
    """
    Set the results of the security check.

    Args:
        visitor_data (DriverCardSecurityCheck): The data from the security check.
    Returns:
        dict: A dictionary indicating the success or failure of setting the security check results.
    """
    event_handler = manager.event_handler

    print("WebSocket: Setting security check results with data:", visitor_data)

    try:
        event_handler.set_security_check_results(
            cancel=visitor_data.cancel,
            visitor_data=visitor_data.model_dump(exclude={"liveness", "cancel"}),
            liveness_status=visitor_data.liveness,
        )
    except Exception as e:
        print(f"FAILED TO SET")
        return {
            "status": "error",
            "message": f"Failed to set security check results: {str(e)}",
        }

    return {"status": "success", "message": "Security check results set successfully."}


#################################################
#################################################
#####              EYE TRACKING             #####
#################################################
#################################################


@router.websocket("/eye_tracking/")
async def eye_tracking(
    ws: WebSocket, proc: FaceProcessor = Depends(get_face_processor)
):
    """
    WebSocket endpoint for real-time eye tracking and gaze classification.

    Receives raw image data (JPEG/PNG) from the client, processes it to extract
    eye tracking metrics, and sends back a JSON response with the results.

    Args:
        ws (WebSocket): The WebSocket connection instance.
        proc (FaceProcessor, optional): Face processor. Defaults to Depends(get_face_processor).
    """
    await ws.accept()
    try:
        while True:
            data = await ws.receive_bytes()  # raw JPEG/PNG
            img_np = np.frombuffer(data, dtype=np.uint8)
            frame = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
            if frame is None:
                print(json.dumps({"error": "decode_failed"}))
                continue

            result = proc.process_frame(frame)
            await ws.send_text(json.dumps(result, ensure_ascii=False))
            await asyncio.sleep(0)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(json.dumps({"error": str(e)}))


def preprocess_face(face_img, size=(224, 224)):
    """
    Preprocess the face image for liveness detection.
    """
    face_img = cv2.resize(face_img, size)
    face_img = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
    face_img = face_img.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    face_img = (face_img - mean) / std
    face_img = np.transpose(face_img, (2, 0, 1))  # HWC → CHW
    face_img = np.expand_dims(face_img, axis=0)  # Add batch dimension
    return face_img.astype(np.float32)


@router.post("/liveness_check/")
async def detect_liveness(
    file: UploadFile = File(...),
    liveness_dependencies=Depends(get_liveness_dependencies),
):
    """
    Detect liveness from an uploaded image file.
    This endpoint processes the image to check if the face is live or spoofed.

    """
    img_bytes = await file.read()
    npimg = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    face_app, onnx_session = liveness_dependencies

    faces = face_app.get(rgb)

    for face in faces:
        x1, y1, x2, y2 = map(int, face.bbox)
        face_img = frame[y1:y2, x1:x2]
        input_tensor = preprocess_face(face_img)

        input_name = onnx_session.get_inputs()[0].name
        output = onnx_session.run(None, {input_name: input_tensor})[0]

        live_prob = float(output[0][0])
        spoof_prob = float(output[0][1])
        # Later, the event handler should be updated here as well.
        # Return immediately if any face passes
        if live_prob > spoof_prob:
            return {"liveness_result": True, "message": "Live face detected."}

    # No face passed, or no face detected
    return {
        "liveness_result": False,
        "message": "No live face detected or all faces spoofed.",
    }
