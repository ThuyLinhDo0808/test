"""
The ChatSession class manages the lifecycle of a single WebSocket connection for a conversational AI system.
It coordinates the STT and TTS pipelines, handles user interactions, and manages state flags for the session.

Key Responsibilities:
- STT and TTS Management: Starts and stops the STT and TTS pipelines for transcription and audio synthesis
- State Management: Maintains session-specific flags like tts_to_client, user_interrupted, and silence_active.
- Callbacks: Implements callbacks for STT and TTS events (e.g., partial transcription, final transcription, word timing).
- Security Monitoring: Runs a background thread to monitor security events and coordinate with the frontend.
- Queue Management: Manages audio and message queues for communication between components.

Iteractions:
- STT Pipeline: Uses the SttPipeline class to handle speech-to-text transcription
- TTS Pipeline: Uses the TtsPipeline class to handle text-to-speech synthesis
- Frontend: Sends messages to the client via the message_queue.
- Security Events: Coordinates with the EventHandler in the workflow service for security checks.
"""

import re
import time
import asyncio
import threading
from app.services.pipelines import SttPipeline, TtsPipeline
from app.models import TimingInfo


class ChatSession:
    """
    Manages state, callbacks and background tasks/threads for a single WebSocket connection's transcription lifecycle.

    This class holds connection-specific state flags (like TTS status, user interruption)
    and implements callback methods triggered by the pipelines. It sends messages back to the client via the provided
    `message_queue` and manages interaction logic like interruptions and final answer delivery.
    It also includes a threaded worker to handle abort checks based on partial transcription.

    When start, it automatically starts the STT and TTS pipelines (including background tasks), and sets up internal callbacks .
    After shutdown, it automatically cleans up the pipelines (shutting down tasks/threads) and abort worker thread.
    """

    def __init__(
        self,
        stt_pipeline: SttPipeline,
        tts_pipeline: TtsPipeline,
    ):
        """
        Initializes a chat session with the provided speech-to-text and text-to-speech pipelines.
        Args:
            stt_pipeline (SttPipeline): The speech-to-text pipeline for transcribing audio input.
            tts_pipeline (TtsPipeline): The text-to-speech pipeline for synthesizing audio output.
        """
        self.transcriber_manager = stt_pipeline
        self.synthesizer_manager = tts_pipeline

        self.message_queue = asyncio.Queue()
        self.audio_chunks = asyncio.Queue()
        self.final_transcription = ""

        # Initialize connection-specific state flags here
        self.tts_to_client: bool = False
        self.user_interrupted: bool = False
        self.tts_chunk_sent: bool = False
        self.tts_client_playing: bool = False
        self.interruption_time: float = 0.0

        # Instance variables or reset logic existed
        self.silence_active: bool = True
        self.is_hot: bool = False
        self.user_finished_turn: bool = False
        self.synthesis_started: bool = False
        self.assistant_answer: str = ""
        self.final_assistant_answer: str = ""
        self.is_processing_potential: bool = False
        self.is_processing_final: bool = False
        self.last_inferred_transcription: str = ""
        self.final_assistant_answer_sent: bool = False
        self.partial_transcription: str = ""  # Added for clarity

        self.reset_state()  # Call reset to ensure consistency

        self.security_thread = threading.Thread(
            target=self.__security_event_monitor,
            name="SecurityEventMonitor",
            daemon=True,
        )
        self.security_thread_running = True

        self.__setup_callbacks()  # Set up internal callbacks for the session

    def start(self):
        """
        Starts internal pipelines and prepare the chat session for processing.
        """
        # These start functions already check if the pipelines are already running
        self.transcriber_manager.start()
        self.synthesizer_manager.start_threads()  # Start the TTS pipeline threads
        self.security_thread.start()  # Start the security event monitor thread

    def get_queues(self) -> tuple[asyncio.Queue, asyncio.Queue]:
        """
        Returns the audio chunks and message queues for the chat session.

        Returns:
            tuple: A tuple containing the audio chunks queue and the message queue.
        """
        return self.audio_chunks, self.message_queue

    def __setup_callbacks(self):
        """
        Sets up the internal callbacks for the transcriber and synthesizer managers.
        """
        self.transcriber_manager.realtime_callback = self.on_partial
        self.transcriber_manager.recording_start_callback = self.on_recording_start
        self.transcriber_manager.silence_active_callback = self.on_silence_active

        # Internal callbacks of the transcriber manager
        # Assign callbacks directly to the service wrapper
        self.transcriber_manager.transcriber.potential_sentence_end_callback = (
            self.on_potential_sentence
        )
        self.transcriber_manager.transcriber.potential_full_transcription_callback = (
            self.on_potential_final
        )
        self.transcriber_manager.transcriber.potential_full_transcription_abort_callback = (
            self.on_potential_abort
        )
        self.transcriber_manager.transcriber.full_transcription_callback = self.on_final
        self.transcriber_manager.transcriber.before_final_sentence_callback = (
            self.on_before_final
        )

        self.synthesizer_manager.on_partial_assistant_text = (
            self.on_partial_assistant_text
        )

        self.synthesizer_manager.synthesizer.on_word_callback = self.on_word

    def reset_state(self):
        """
        Resets connection-specific state flags and variables to their initial values.
        """
        # Reset all connection-specific state flags
        self.tts_to_client = False
        self.user_interrupted = False
        self.tts_chunk_sent = False
        # Don't reset tts_client_playing here, it reflects client state reports
        self.interruption_time = 0.0

        # Reset other state variables
        self.silence_active = True
        self.is_hot = False
        self.user_finished_turn = False
        self.synthesis_started = False
        self.assistant_answer = ""
        self.final_assistant_answer = ""
        self.is_processing_potential = False
        self.is_processing_final = False
        self.last_inferred_transcription = ""
        self.final_assistant_answer_sent = False
        self.partial_transcription = ""

        # Keep the abort call related to the audio processor/pipeline manager
        self.synthesizer_manager.abort_generation()

    def __security_event_monitor(self):
        """
        Unified event monitoring loop for security frontend coordination.
        Checks:
        - do_security_check -> to trigger frontend workflow
        - security_op_completed -> to send QR/PIN
        """
        print("Chat Session: Starting event monitor thread.")

        last_check_sent = False
        event_handler = self.synthesizer_manager.llm.event_handler

        while self.security_thread_running:
            # Trigger security check request
            if event_handler.do_security_check.is_set() and not last_check_sent:
                print("Chat Session: Triggering security check request to frontend.")

                self.message_queue.put_nowait(
                    {"type": "security_check_request", "content": ""}
                )
                last_check_sent = True

            # Trigger security op completed to frontend
            if event_handler.security_op_completed.is_set():
                print(
                    "Chat Session: Triggering security operation completed to frontend."
                )

                # If not success, the permission data will be None automatically
                success = event_handler.permission_data != None

                self.message_queue.put_nowait(
                    {
                        "type": "security_op_completed",
                        "content": {
                            "data": event_handler.permission_data,
                            "success": success,
                        },
                    }
                )

                # Reset the flags after sending
                event_handler.reset()
                last_check_sent = False
                print("Chat Session: Security state reset for next operation.")

            time.sleep(0.1)  # Avoid busy waiting

    def on_partial(self, text: str):
        """
        Callback invoked when a partial transcription result is available.

        Updates internal state, sends the partial result to the client,
        and signals the abort worker thread to check for potential interruptions.

        Args:
            text: The partial transcription text.
        """
        self.final_assistant_answer_sent = (
            False  # New user speech invalidates previous final answer sending state
        )
        self.final_transcription = ""  # Clear final transcription as this is partial
        self.partial_transcription = text
        self.message_queue.put_nowait({"type": "partial_user_request", "content": text})

    def on_word(self, timing_info: TimingInfo):
        # Push timing info to client
        self.message_queue.put_nowait(
            {"type": "word_timing", "content": timing_info.to_dict()}
        )

    def on_potential_sentence(self, text: str):
        """
        Callback invoked when a potentially complete sentence is detected by the STT.

        Triggers the preparation of a speech generation based on this potential sentence.

        Args:
            text: The potential sentence text.
        """
        print(f"Chat Session: Potential sentence detected: {text}")

    def on_potential_final(self, text: str):
        """
        Callback invoked when a potential *final* transcription is detected (hot state).

        Logs the potential final transcription.

        Args:
            text: The potential final transcription text.
        """
        print(f"Chat Session: Potential final transcription detected: {text}")

    def on_potential_abort(self):
        """Callback invoked if the STT detects a potential need to abort based on user speech."""
        # Placeholder
        pass

    def on_before_final(self, text: str):
        """
        Callback invoked just before the final STT result for a user turn is confirmed.

        Sets flags indicating user finished, allows TTS if pending, interrupts microphone input,
        releases TTS stream to client, sends final user request and any pending partial
        assistant answer to the client, and adds user request to history.

        Args:
            audio: The raw audio bytes corresponding to the final transcription. (Currently unused)
            text: The transcription text (might be slightly refined in on_final).
        """
        print("Chat Session: User turn end.")
        self.user_finished_turn = True
        self.user_interrupted = False  # Reset user interruption state

        # First block further incoming audio
        if not self.transcriber_manager.interrupted:
            print("Chat Session: Microphone input interrupted.")
            self.transcriber_manager.interrupted = True
            self.interruption_time = time.time()

        print("Chat Session: Releasing TTS stream to client.")
        self.tts_to_client = True

        # Send final user request
        user_request_content = (
            self.final_transcription
            if self.final_transcription
            else self.partial_transcription
        )
        self.message_queue.put_nowait(
            {"type": "final_user_request", "content": user_request_content}
        )

        # Access global manager state
        if self.synthesizer_manager.is_valid_gen():
            # Send partial assistant answer (if available) to the client
            # Use connection-specific user_interrupted flag
            if (
                self.synthesizer_manager.running_generation.quick_answer
                and not self.user_interrupted
            ):
                self.assistant_answer = (
                    self.synthesizer_manager.running_generation.quick_answer
                )
                self.message_queue.put_nowait(
                    {
                        "type": "partial_assistant_answer",
                        "content": self.assistant_answer,
                    }
                )

        print("Chat Session: Adding user request to history.")

    def on_final(self, text: str):
        """
        Callback invoked when the final transcription result for a user turn is available.

        Logs the final transcription and stores it.

        Args:
            txt: The final transcription text.
        """
        print(f"Chat Session: Final transcription received: {text}")
        if not self.final_transcription:
            self.final_transcription = text

        self.message_queue.put_nowait(
            {"type": "final_user_request", "content": self.final_transcription}
        )

        self.synthesizer_manager.prepare_generation(self.final_transcription)

    def abort_generations(self):
        """
        Triggers the abortion of any ongoing speech generation process.
        """
        print("Chat Session: Aborting ongoing generation.")
        self.synthesizer_manager.abort_generation()

    def on_silence_active(self, silence_active: bool):
        """
        Callback invoked when the silence detection state changes.

        Updates the internal silence_active flag.

        Args:
            silence_active: True if silence is currently detected, False otherwise.
        """
        self.silence_active = silence_active

    def on_partial_assistant_text(self, text: str):
        """
        Callback invoked when a partial text result from the assistant (LLM) is available.

        Updates the internal assistant answer state and sends the partial answer to the client,
        unless the user has interrupted.

        Args:
            text: The partial assistant text.
        """
        print(f"Chat Session: Partial assistant text received: {text}")
        if not self.user_interrupted:
            self.assistant_answer = text
            # Use connection-specific tts_to_client flag
            if self.tts_to_client:
                self.message_queue.put_nowait(
                    {"type": "partial_assistant_answer", "content": text}
                )

    def on_recording_start(self):
        """
        Callback invoked when the audio input processor starts recording user speech.

        If client-side TTS is playing, it triggers an interruption: stops server-side
        TTS streaming, sends stop/interruption messages to the client, aborts ongoing
        generation, sends any final assistant answer generated so far, and resets relevant state.
        """
        print(
            f"Chat Session: Recording started. TTS client playing: {self.tts_client_playing}"
        )

        if self.tts_client_playing:
            self.tts_to_client = False  # Stop TTS to client
            self.user_interrupted = True  # Set user interrupted state
            print(
                "Chat Session: TTS client is playing, interrupting current TTS streaming."
            )

            # Send final assistant answer if one was generated and not sent
            self.send_final_assistant_answer(forced=True)

            self.tts_chunk_sent = False

            self.message_queue.put_nowait(
                {
                    "type": "stop_tts",  # Client handles this to mute/ignore
                    "content": "",
                }
            )

            self.abort_generations()

            self.message_queue.put_nowait(
                {  # Tell client to stop playback and clear buffer
                    "type": "tts_interruption",
                    "content": "",
                }
            )

    def send_final_assistant_answer(self, forced=False):
        """
        Sends the final (or best available) assistant answer to the client.

        Constructs the full answer from quick and final parts if available.
        If `forced` and no full answer exists, uses the last partial answer.
        Cleans the text and sends it as 'final_assistant_answer' if not already sent.

        Args:
            forced: If True, attempts to send the last partial answer if no complete
                    final answer is available. Defaults to False.
        """
        final_answer = ""

        if self.synthesizer_manager.is_valid_gen():
            final_answer = (
                self.synthesizer_manager.running_generation.quick_answer
                + self.synthesizer_manager.running_generation.final_answer
            )

        if not final_answer:  # Check if empty
            # If forced, try using the last known partial answer from this connection
            if forced and self.assistant_answer:
                final_answer = self.assistant_answer
                print(
                    f"Chat Session: Forcing final assistant answer to last known partial: {final_answer}"
                )
            else:
                print("Chat Session: No final assistant answer available to send.")
                return

        print(
            f"Chat Session: Attempting to send final assistant answer: {final_answer} Sent previously: {self.final_assistant_answer_sent}"
        )

        if not self.final_assistant_answer_sent and final_answer:
            cleaned_answer = re.sub(r"[\r\n]+", " ", final_answer)
            cleaned_answer = re.sub(r"\s+", " ", cleaned_answer).strip()
            cleaned_answer = cleaned_answer.replace("\\n", " ")
            cleaned_answer = re.sub(r"\s+", " ", cleaned_answer).strip()

            if cleaned_answer:  # Ensure it's not empty after cleaning
                print(f"Chat Session: Final assistant answer sending: {cleaned_answer}")
                self.message_queue.put_nowait(
                    {"type": "final_assistant_answer", "content": cleaned_answer}
                )

                self.final_assistant_answer_sent = True
                self.final_assistant_answer = cleaned_answer
            else:
                print(
                    "Chat Session: Final assistant answer was empty after cleaning, not sending."
                )
                self.final_assistant_answer_sent = False
                self.final_assistant_answer = ""
        elif (
            forced and not final_answer
        ):  # Should not happen due to earlier check, but safety
            self.final_assistant_answer = ""

    def shutdown(self):
        """
        Shuts down the conversation manager and any associated services.
        This is useful for cleanup when the application is terminating.
        """
        # Don't fully shutdown the managers here, just stop the abort worker thread and tasks
        self.transcriber_manager.shutdown()

        # We don't want to clear memory here, as it might be used in the next session
        self.synthesizer_manager.shutdown()

        # Shutdown the security event monitor thread
        if self.security_thread.is_alive():
            print("Chat Session: Shutting down security event monitor thread.")
            self.security_thread_running = False
            self.security_thread.join(timeout=5)

            if self.security_thread.is_alive():
                print(
                    "Chat Session: Security event monitor thread did not shut down cleanly."
                )
            else:
                print(
                    "Chat Session: Security event monitor thread shut down successfully."
                )
        else:
            print(
                "Chat Session: Security event monitor thread already shut down or not started."
            )

        # Clear the queues
        self.clear_queues()

        print("Chat Session: Shutdown complete, all queues cleared.")

    def clear_queues(self):
        """
        Clears the message and audio chunk queues.
        This is useful to ensure no stale data remains in the queues.
        """
        while not self.message_queue.empty():
            self.message_queue.get_nowait()

        while not self.audio_chunks.empty():
            self.audio_chunks.get_nowait()

        print("Chat Session: Queues cleared.")
