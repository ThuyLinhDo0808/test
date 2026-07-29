"""
The TtsPipeline class orchestrates the text-to-speech generation process.
It manages LLM (language model) inference, TTS synthesis, and the lifecycle of a generation.

Key Responsibilities
- LLM Integration: Uses a language model to generate text responses.
- TTS Synthesis: Converts text responses into audio using the TtsService.
- Worker Threads: Manages worker threads for processing requests, LLM inference, and TTS synthesis.
- Abort Handling: Handles abortion of ongoing generations when new input is received.

Interactions
- TTS Service: Uses the TtsService class for audio synthesis.
- Conversation Manager: Coordinates with the ConversationManager for LLM responses.
- ChatSession: Provides synthesized audio to the ChatSession for playback.
"""

import time
import threading
from queue import Queue, Empty
from typing import Optional, Any, Generator, Callable
from langchain_core.messages import HumanMessage
from app.services.pipelines.tts_service import TtsService
from app.services.workflow_service import ConversationManager
from app.services.pipelines.utils import TextSimilarity, TextContext
from app.models import TimingInfo


class PipelineRequest:
    """
    Represents a request to the TTS pipeline.
    Holds information about the action to perform (e.g., 'prepare', 'abort'),
    associated data (e.g., text input), and a timestamp for potential de-duplication.
    """

    def __init__(self, action: str, data: Optional[Any]):
        self.action = action
        self.data = data
        self.timestamp = time.time()


class RunningGeneration:
    """
    Holds the state and resources for a single, ongoing text-to-speech generation process.

    This includes the generation ID, input text, the LLM generator object, flags indicating
    the status of LLM and TTS stages (quick and final), threading events for synchronization,
    queues for audio chunks, and text buffers for partial/complete answers.
    """

    def __init__(self, id: int):
        """
        Initializes a new RunningGeneration instance.

        Args:
            id (int): A unique identifier for this generation instance.
        """
        self.id = id
        self.text: Optional[str] = None
        self.timestamp = time.time()

        self.llm_generator: Optional[Generator] = None
        self.llm_finished: bool = False
        self.llm_finished_event = threading.Event()
        self.llm_aborted: bool = False

        self.quick_answer: str = ""
        self.quick_answer_provided: bool = False
        self.quick_answer_first_chunk_ready: bool = False
        self.quick_answer_overhang: str = (
            ""  # This is the part of the text that was not used in the context
        )
        self.tts_quick_started: bool = False

        self.audio_chunks = Queue()
        self.audio_quick_finished: bool = False
        self.audio_quick_aborted: bool = False
        self.tts_quick_finished_event = threading.Event()

        self.abortion_started: bool = False

        self.tts_final_finished_event = threading.Event()
        self.tts_final_started: bool = False
        self.audio_final_aborted: bool = False
        self.audio_final_finished: bool = False
        self.final_answer: str = ""

        self.completed: bool = False


class TtsPipeline:
    """
    Orchestrates the text-to-speech pipeline, managing LLM and TTS workers.
    This class handles incoming text requests, manages the lifecycle of a generation
    (including LLM inference, TTS synthesis for both quick and final parts),
    facilitates aborting ongoing generations, manages conversation history,
    and coordinates worker threads using queues and events.
    """

    def __init__(
        self, synthesizer: TtsService, conversation_manager: ConversationManager
    ):
        """
        Sets up configuration for the TTS pipeline.

        Args:
            synthesizer (TtsService): The text-to-speech synthesizer service instance.
            conversation_manager (ConversationManager): The conversation manager instance which wraps the LLM
        """
        self.synthesizer = synthesizer
        self.llm = conversation_manager  # This should already be initialized
        self.text_similarity = TextSimilarity(n_words=5)
        self.text_context = TextContext()

        self.synthesizer.on_first_audio_chunk_synthesize = (
            self.__on_first_audio_chunk_synthesize
        )

        self.generation_counter: int = 0
        self.abort_lock = threading.Lock()
        self.requests_queue = Queue()
        self.running_generation: Optional[RunningGeneration] = None

        # Threading events
        self.shutdown_event = threading.Event()
        self.generator_ready_event = threading.Event()
        self.llm_answer_ready_event = threading.Event()
        self.stop_everything_event = threading.Event()
        self.stop_llm_request_event = threading.Event()
        self.stop_llm_finished_event = threading.Event()
        self.stop_tts_quick_request_event = threading.Event()
        self.stop_tts_quick_finished_event = threading.Event()
        self.stop_tts_final_request_event = threading.Event()
        self.stop_tts_final_finished_event = threading.Event()
        self.abort_completed_event = threading.Event()
        self.abort_block_event = threading.Event()
        self.abort_block_event.set()
        self.check_abort_lock = threading.Lock()

        self.thread_started_event = threading.Event()

        # State flags
        self.llm_generation_active = False
        self.tts_quick_generation_active = False
        self.tts_final_generation_active = False
        self.previous_request = None

        # Worker threads
        self.request_processing_thread = threading.Thread(
            target=self.__request_processing_worker,
            name="RequestProcessingThread",
            daemon=True,
        )
        self.llm_inference_thread = threading.Thread(
            target=self.__llm_inference_worker, name="LLMProcessingThread", daemon=True
        )
        self.tts_quick_inference_thread = threading.Thread(
            target=self.__tts_quick_inference_worker,
            name="TTSQuickProcessingThread",
            daemon=True,
        )
        self.tts_final_inference_thread = threading.Thread(
            target=self.__tts_final_inference_worker,
            name="TTSFinalProcessingThread",
            daemon=True,
        )

        # self.request_processing_thread.start()
        # self.llm_inference_thread.start()
        # self.tts_quick_inference_thread.start()
        # self.tts_final_inference_thread.start()

        # Callback function to stream partial LLM responses to the frontend as soon as they are available
        self.on_partial_assistant_text: Optional[Callable[[str], None]] = None
        self.on_word: Optional[Callable[[TimingInfo], None]] = None

    def get_conversation_manager(self) -> ConversationManager:
        """
        Returns the conversation manager instance that wraps the LLM.

        Returns:
            ConversationManager: An instance of the ConversationManager class that manages LLM interactions.
        """

        return self.llm

    def is_valid_gen(self) -> bool:
        """
        Checks if there is a currently running generation that has not started aborting.

        Returns:
            True if `running_generation` exists and its `abortion_started` flag is False,
            False otherwise.
        """
        return (
            self.running_generation is not None
            and not self.running_generation.abortion_started
        )

    def __request_processing_worker(self):
        """
        Worker thread target that processes requests from the `requests_queue`.

        Continuously monitors the queue. When a request arrives, it drains the queue
        to process only the most recent one, preventing processing of stale requests.
        It waits for any ongoing abort operation to complete (`abort_block_event`)
        before processing the next request. Handles 'prepare' actions by calling
        `process_prepare_generation`. Runs until `shutdown_event` is set.
        """
        print("Request processor: Worker started.")
        while not self.shutdown_event.is_set():
            try:
                # Get most recent request by emptying the queue
                request = self.requests_queue.get(block=True, timeout=1)

                if self.previous_request:
                    # timestamp-based deduplication for identical consecutive requests
                    if self.previous_request.data == request.data and isinstance(
                        request.data, str
                    ):
                        if request.timestamp - self.previous_request.timestamp < 2:
                            print(
                                f"Request processor: Skipping duplicate request: {request.action}"
                            )
                            continue

                # Drain the queue to get the most recent request
                while not self.requests_queue.empty():
                    skipped_request = self.requests_queue.get(False)
                    request = skipped_request  # Keep the last one

                self.abort_block_event.wait()  # Wait for any ongoing abort to finish

                print(
                    "Request processor: Processing most recent request:", request.action
                )

                if request.action == "prepare":
                    self.process_prepare_generation(request.data)
                    self.previous_request = request
                elif request.action == "finish":
                    print("Request processor: Received finish action.")
                    self.previous_request = request
                else:
                    print(
                        f"Request processor: Unknown action '{request.action}' in request."
                    )
            except Empty:
                continue
            except Exception as e:
                print(f"Request processor: Error processing request: {e}")

        print("Request processor: Worker shutting down...")

    def __on_first_audio_chunk_synthesize(self):
        """
        Callback triggered when the first audio chunk is synthesized.
        Sets the `quick_answer_first_chunk_ready` flag on the current `running_generation`
        if one exists. This flag might be used for fine-grained timing or state checks.
        """
        print(
            "TTS Pipeline: First audio chunk synthesized. Setting TTS quick allowed event."
        )
        if self.running_generation:
            self.running_generation.quick_answer_first_chunk_ready = True

    def __preprocess_chunk(self, chunk: str) -> str:
        """
        Preprocesses a text chunk before sending it to the TTS engine.

        Replaces specific characters normally generated by LLMs (em-dashes, quotes, ellipsis) with simpler equivalents
        to potentially improve TTS pronunciation or compatibility.

        Args:
            chunk: The input text chunk.

        Returns:
            The preprocessed text chunk.
        """
        return (
            chunk.replace("—", "-")
            .replace("“", '"')
            .replace("”", '"')
            .replace("‘", "'")
            .replace("’", "'")
            .replace("…", "...")
        )

    # TODO: Look into this function, it seems to be blocking if it can't find a quick answer
    # Might be coming from text context
    def __llm_inference_worker(self):
        """
        Worker thread target that handles LLM inference for a generation.
        Waits for `generator_ready_event`. Once signaled, it iterates through the
        LLM generator provided in `running_generation`. It accumulates the generated
        text, optionally cleans it (`no_think`), checks for a natural sentence boundary
        to define the `quick_answer` using `TextContext`. If a quick answer is found,
        it signals `llm_answer_ready_event`. Handles stop requests (`stop_llm_request_event`)
        and signals completion/abortion via `stop_llm_finished_event` and internal flags.
        Runs until `shutdown_event` is set.
        """
        print("LLM processor: Worker started.")

        while not self.shutdown_event.is_set():
            ready = self.generator_ready_event.wait(timeout=1)
            if not ready:
                continue

            # Check if aborted while waiting before clearing the ready event
            if self.stop_llm_request_event.is_set():
                print("LLM processor: Stop request received, aborting LLM generation.")
                self.stop_llm_request_event.clear()
                self.stop_llm_finished_event.set()
                self.llm_generation_active = False
                continue  # Go back to waiting

            self.generator_ready_event.clear()
            self.stop_everything_event.clear()  # Assuming a new generation clears global stop
            current_gen = self.running_generation

            if not current_gen or not current_gen.llm_generator:
                print("LLM processor: No valid running generation or generator.")
                self.llm_generation_active = False
                continue  # Go back to waiting

            gen_id = current_gen.id
            print(f"LLM processor: Processing generation for gen {gen_id}.")

            # Set state for active generation
            self.llm_generation_active = True
            self.stop_llm_finished_event.clear()

            try:
                for chunk in current_gen.llm_generator:
                    # Check for stop before processing the chunk
                    if self.stop_llm_request_event.is_set():
                        print(
                            "LLM processor: Stop request received during LLM iteration."
                        )
                        self.stop_llm_request_event.clear()
                        current_gen.llm_aborted = True
                        break  # Exit generator loop

                    chunk = self.__preprocess_chunk(chunk)
                    current_gen.quick_answer += chunk

                    # Check for quick answer boundary if not already provided
                    if not current_gen.quick_answer_provided:
                        context, overhang = self.text_context.get_context(
                            current_gen.quick_answer
                        )

                        if context:
                            print(
                                f"LLM processor: Quick answer found for gen {gen_id}: context - {context} | overhang - {overhang}"
                            )
                            current_gen.quick_answer = context
                            if self.on_partial_assistant_text:
                                self.on_partial_assistant_text(current_gen.quick_answer)
                            current_gen.quick_answer_overhang = overhang
                            current_gen.quick_answer_provided = True
                            self.llm_answer_ready_event.set()  # Signal TTS quick worker
                            break

                print(
                    f"LLM Processor: Finished processing generation loop"
                    + (" (Aborted)" if current_gen.llm_aborted else "")
                )

                # If loop finished naturally and no quick answer was ever found (e.g., short response)
                # Then set the quick answer to the full text
                if (
                    not current_gen.llm_aborted
                    and not current_gen.quick_answer_provided
                ):
                    print(
                        f"LLM processor: No context boundary found for gen {gen_id}, setting full text as quick answer."
                    )

                    # Already contains the whole text in the previous loop
                    current_gen.quick_answer_provided = True
                    if self.on_partial_assistant_text:
                        self.on_partial_assistant_text(current_gen.quick_answer)
                    self.llm_answer_ready_event.set()  # Signal TTS quick worker
            except Exception as e:
                print(f"LLM processor: Error during generation for gen {gen_id}: {e}")
                current_gen.llm_aborted = True  # Aborted
            finally:
                # Clean up state regardless of success or failure
                self.llm_generation_active = False
                self.stop_llm_finished_event.set()  # Set as done

                if current_gen.llm_aborted:
                    # If aborted, ensure TTS is also stopped
                    self.stop_tts_quick_request_event.set()
                    self.stop_tts_final_request_event.set()
                    # Wake up TTS quick worker
                    self.llm_answer_ready_event.set()

                print("LLM processor: Worker finished processing generation.")

                current_gen.llm_finished = True
                current_gen.llm_finished_event.set()  # Signal completion

    def check_abort(self, text: str, wait_for_finish: bool = True) -> bool:
        """
        Checks if the current generation should be aborted based on new input text.
        Compares the provided text (`txt`) with the text of the `running_generation`.
        If a generation is running and not already aborting:
        1. If `txt` is very similar (>= 0.95 similarity) to the running generation's
           input text, it ignores the new request and returns False.
        2. If `txt` is different, it initiates an abort of the current generation
           by calling the public `abort_generation` method.

        If `wait_for_finish` is True, this method waits for the abortion process
        initiated by `abort_generation` to complete before returning.

        If a generation is already in the process of aborting when this method is called,
        it will wait (if `wait_for_finish` is True) for that ongoing abort to finish.

        Args:
            text (str): The new text input to check against the current generation's input.
            wait_for_finish (bool, optional): Whether to block until the initiated/ongoing abort completes. Defaults to True.

        Returns:
            bool: True if an abortion was processed (either newly initiated or waited for). False if no active generation was found or the new text was too similar.
        """
        while self.check_abort_lock:
            if self.running_generation:
                if self.running_generation.abortion_started:

                    # Only wait if wait_for_finish is True
                    if wait_for_finish:
                        completed = self.abort_completed_event.wait(timeout=5)

                        if not completed:
                            print(
                                "TTS Pipeline: Abort check timed out waiting for abortion to complete."
                            )
                            self.running_generation = None
                        elif self.running_generation is not None:
                            print(
                                "TTS Pipeline: Abort check completed, but running generation is still active."
                            )
                            # Force clear
                            self.running_generation = None
                        else:
                            print("TTS Pipeline: Abort check completed successfully.")
                    # Not waiting, just return
                    return True
                else:
                    # No abortion in progress, check similarity
                    print(
                        "TTS Pipeline: Found active generation, checking similarity for abortion."
                    )
                    similarity = 0.0
                    try:
                        # Ensure text is not None before comparison
                        if self.running_generation.text is None:
                            print(
                                "TTS Pipeline: Running generation text is None, cannot check similarity. Assuming different."
                            )
                            similarity = 0.0
                        else:
                            similarity = self.text_similarity.calculate_similarity(
                                self.running_generation.text, text
                            )
                    except Exception as e:
                        print("TTS Pipeline: Error calculating similarity:", e)
                        similarity = 0.0

                    if similarity >= 0.95:
                        print(
                            f"TTS Pipeline: Text is too similar (similarity={similarity:.2f}), ignoring abort request."
                        )
                        return False  # No abort needed, text is too similar

                    # Call the abort method
                    self.abort_generation(
                        wait_for_completion=wait_for_finish, timeout=7
                    )

                    if wait_for_finish:
                        # Check state after waiting for abort call
                        if self.running_generation is not None:
                            print(
                                "TTS Pipeline: Abort call completed, but running generation is still not None."
                            )
                            self.running_generation = None

                    return True  # An abort was initiated
            else:
                print("TTS Pipeline: No active generation found, no abort needed.")
                return False

    def __tts_quick_inference_worker(self):
        """
        Worker thread target that handles TTS synthesis for the 'quick answer'.

        Waits for `llm_answer_ready_event`. Once signaled, it checks if the generation
        is valid and has a `quick_answer`.
        If allowed, it calls `audio.synthesize` with the `quick_answer`, feeding audio
        chunks into the `audio_chunks` queue. Handles stop requests
        (`stop_tts_quick_request_event`) and signals completion/abortion via
        `stop_tts_quick_finished_event` and internal flags. Runs until `shutdown_event` is set.
        """
        print("TTS Quick processor: Worker started.")

        while not self.shutdown_event.is_set():
            ready = self.llm_answer_ready_event.wait(timeout=1)
            if not ready:
                continue

            # Check if aborted while waiting before clearing the ready event
            if self.stop_tts_quick_request_event.is_set():
                print(
                    "TTS Quick processor: Stop request received, aborting TTS quick generation."
                )
                self.stop_tts_quick_request_event.clear()
                self.stop_tts_quick_finished_event.set()
                self.tts_quick_generation_active = False
                continue  # Go back to waiting

            self.llm_answer_ready_event.clear()  # Clear the event for the next round
            current_gen = self.running_generation

            if not current_gen or not current_gen.quick_answer_provided:
                print(
                    "TTS Quick processor: No valid running generation or quick answer not provided."
                )
                self.tts_quick_generation_active = False
                continue  # Go back to waiting

            # Check if generation was aborted here
            if current_gen.audio_quick_aborted or current_gen.abortion_started:
                print(
                    "TTS Quick processor: Generation aborted, skipping TTS quick synthesis."
                )
                continue

            gen_id = current_gen.id

            # Set states for active generation
            self.tts_quick_generation_active = True
            self.stop_tts_quick_finished_event.clear()
            current_gen.tts_quick_finished_event.clear()  # Reset the event for this generation
            current_gen.tts_quick_started = True

            try:
                # Check for aborts before synthesizing
                if (
                    self.stop_tts_quick_request_event.is_set()
                    or current_gen.abortion_started
                ):
                    print(
                        "TTS Quick processor: Stop request received before synthesis, aborting quick TTS generation."
                    )
                    current_gen.audio_quick_aborted = True
                else:
                    print(
                        f"TTS Quick processor: Starting TTS synthesis for gen {gen_id}."
                    )
                    completed = self.synthesizer.synthesize_text(
                        current_gen.quick_answer,
                        current_gen.audio_chunks,
                        self.stop_tts_quick_request_event,
                    )

                    if not completed:
                        # Synthesis was aborted
                        print(
                            f"TTS Quick processor: Synthesis for gen {gen_id} was aborted."
                        )
                        current_gen.audio_quick_aborted = True
                    else:
                        print(
                            f"TTS Quick processor: Synthesis for gen {gen_id} completed successfully."
                        )
            except Exception as e:
                print(
                    f"TTS Quick processor: Error during TTS synthesis for gen {gen_id}: {e}"
                )
                current_gen.audio_quick_aborted = True
            finally:
                # Clean up state regardless of success or failure
                self.tts_quick_generation_active = False
                self.stop_tts_quick_finished_event.set()  # Set as done

                # Check if synthesis completed naturally or was stopped
                if (
                    current_gen.audio_final_aborted
                    or self.stop_tts_quick_request_event.is_set()
                ):
                    self.stop_tts_quick_request_event.clear()  # Clear stop request for next round
                    current_gen.audio_quick_aborted = True
                else:
                    current_gen.tts_quick_finished_event.set()  # Signal natural completion

                current_gen.audio_quick_finished = True

    def __tts_final_inference_worker(self):
        """
        Worker thread that handles TTS synthesis for the 'final answer'.
        Continuously checks the `running_generation`. It waits until the 'quick' TTS
        phase (`tts_quick_started` and `audio_quick_finished`) is complete and was not
        aborted (`audio_quick_aborted`). It also requires that a `quick_answer` was
        actually identified (`quick_answer_provided`).

        If conditions are met, it sets flags (`tts_final_started`), defines an inner
        generator (`get_generator`) that yields the `quick_answer_overhang` followed
        by the remaining chunks from the `llm_generator`. It then calls
        `audio.synthesize_generator` with this generator, feeding audio chunks into the
        same `audio_chunks` queue used by the quick worker. Handles stop requests
        (`stop_tts_final_request_event`) and signals completion/abortion via
        `stop_tts_final_finished_event` and internal flags. Runs until `shutdown_event` is set.
        """
        print("TTS Final processor: Worker started")

        while not self.shutdown_event.is_set():
            current_gen = self.running_generation
            time.sleep(0.1)  # Prevent tight spinning while idle

            # Wait for prerequesites to be met
            if not current_gen:
                continue  # No active generation
            if current_gen.tts_final_started:
                continue  # Already started final TTS
            if not current_gen.tts_quick_started:
                continue  # Quick TTS not started
            if not current_gen.audio_quick_finished:
                continue  # Quick TTS not finished

            gen_id = current_gen.id

            # Check conditions to start final TTS
            if current_gen.audio_quick_aborted:
                print(
                    f"TTS Final processor: Quick TTS for gen {gen_id} was aborted, skipping final TTS."
                )
                continue
            if not current_gen.quick_answer_provided:
                print(
                    f"TTS Final processor: Quick answer boundary not found for gen {gen_id}, skipping final TTS as quick answer handled everything."
                )
                continue
            if current_gen.abortion_started:
                print(
                    f"TTS Final processor: Abortion started for gen {gen_id}, skipping final TTS."
                )
                continue

            print("TTS Final processor: Starting final TTS synthesis for gen", gen_id)

            def get_generator():
                """
                Yield remaining text chunks for final TTS synthesis.
                """
                # Get overhang first
                if current_gen.quick_answer_overhang:
                    preprocessed_overhang = self.__preprocess_chunk(
                        current_gen.quick_answer_overhang
                    )
                    current_gen.final_answer += preprocessed_overhang

                    if self.on_partial_assistant_text:
                        print(
                            f"TTS Final processor: Yielding quick answer overhang for gen {gen_id}"
                        )
                        try:
                            self.on_partial_assistant_text(
                                current_gen.quick_answer + current_gen.final_answer
                            )
                        except Exception as e:
                            print(
                                f"TTS Final processor: Error in on_partial_assistant_text overhang callback: {e}"
                            )
                    yield preprocessed_overhang

                # Yield remaining chunks from the LLM generator
                print(
                    f"TTS Final processor: Yielding remaining chunks for gen {gen_id}"
                )

                try:
                    for chunk in current_gen.llm_generator:
                        # Check for stop before processing the chunk
                        if self.stop_tts_final_request_event.is_set():
                            print(
                                "TTS Final processor: Stop request received during final TTS iteration."
                            )
                            current_gen.audio_final_aborted = True
                            break

                        preprocessed_chunk = self.__preprocess_chunk(chunk)
                        current_gen.final_answer += preprocessed_chunk

                        if self.on_partial_assistant_text:
                            try:
                                self.on_partial_assistant_text(
                                    current_gen.quick_answer + current_gen.final_answer
                                )
                            except Exception as e:
                                print(
                                    f"TTS Final processor: Error in on_partial_assistant_text callback: {e}"
                                )

                        yield preprocessed_chunk
                    print(
                        f"TTS Final processor: Finished iterating chunks for gen {gen_id}"
                    )
                except Exception as e:
                    print(
                        f"TTS Final processor: Error during final TTS chunk iteration for gen {gen_id}: {e}"
                    )
                    current_gen.audio_final_aborted = True

            # Set states for active generation
            self.tts_final_generation_active = True
            self.stop_tts_final_finished_event.clear()
            current_gen.tts_final_started = True
            current_gen.tts_final_finished_event.clear()  # Reset TTS finish marker

            try:
                print(
                    "TTS Final processor: Synthesizing remaining text for gen", gen_id
                )
                completed = self.synthesizer.synthesize_generator(
                    get_generator(),
                    current_gen.audio_chunks,
                    self.stop_tts_final_request_event,
                )

                if not completed:
                    print(
                        f"TTS Final processor: Synthesis for gen {gen_id} was aborted."
                    )
                    current_gen.audio_final_aborted = True
                else:
                    print(
                        f"TTS Final processor: Synthesis for gen {gen_id} completed successfully."
                    )
            except Exception as e:
                print(
                    f"TTS Final processor: Error during final TTS synthesis for gen {gen_id}: {e}"
                )
                current_gen.audio_final_aborted = True
            finally:
                self.tts_final_generation_active = False
                self.stop_tts_final_finished_event.set()  # Signal as done

                # Check if synthesis completed naturally or was stopped
                if (
                    current_gen.audio_final_aborted
                    or self.stop_tts_final_request_event.is_set()
                ):
                    self.stop_tts_final_request_event.clear()
                    current_gen.audio_final_aborted = True
                else:
                    current_gen.tts_final_finished_event.set()  # Signal natural completion

                current_gen.audio_final_finished = True

    def process_prepare_generation(self, text: str):
        """
        Handles the 'prepare' action: initiates a new text-to-speech generation.

        1. Calls `check_abort` to potentially stop and clean up any existing generation
           if the new input `text` is significantly different. Waits for the abort to finish.
        2. Increments the `generation_counter`.
        3. Resets state flags and events relevant to starting a new generation.
        4. Creates a new `RunningGeneration` instance with the new ID and input text.
        5. Calls `llm.generate` to get the LLM response generator.
        6. Stores the generator in `running_generation.llm_generator`.
        7. Sets `generator_ready_event` to signal the LLM worker thread to start processing.
        8. Cleans up `running_generation` if LLM generator creation fails.

        Args:
            text (str): The user input text for the new generation.
        """
        aborted = self.check_abort(text, wait_for_finish=True)

        # Guratee state is clean
        self.generation_counter += 1
        new_gen_id = self.generation_counter

        # Reset flags and events (not needed after sync abort but for safety)
        self.llm_generation_active = False
        self.tts_quick_generation_active = False
        self.tts_final_generation_active = False
        self.llm_answer_ready_event.clear()
        self.generator_ready_event.clear()
        self.stop_llm_request_event.clear()
        self.stop_llm_finished_event.clear()
        self.stop_tts_quick_request_event.clear()
        self.stop_tts_quick_finished_event.clear()
        self.stop_tts_final_request_event.clear()
        self.stop_tts_final_finished_event.clear()
        self.abort_completed_event.clear()
        self.abort_block_event.set()  # Ensure block is released if check_abort didn't run/clear it

        # Create a new running generation
        self.running_generation = RunningGeneration(id=new_gen_id)
        self.running_generation.text = text

        def filter_generator(
            generator: Generator[str, None, None],
        ) -> Generator[str, None, None]:
            """
            Filter out generator to yield only the text chunks

            Args:
                generator (Generator[str, None, None]): The generator to filter.

            Yields:
                Generator[str, None, None]: A generator that yields only the text chunks.
            """
            for chunk in generator:
                msg = chunk["msg"]
                yield msg if isinstance(msg, str) else ""

        try:
            print(
                "TTS Pipeline: Generating LLM response for new generation ID",
                new_gen_id,
            )

            inputs = {
                "messages": HumanMessage(content=text),
                "n_generations": 0,
                "max_retries": 3,
            }

            # Pass an event lock to the stream function so that it can be interrupted and incomplete message can be saved
            self.running_generation.llm_generator = filter_generator(
                self.llm.stream(input=inputs, stop_event=self.stop_llm_request_event)
            )

            print("TTS Pipeline: LLM response generator created successfully.")
            self.generator_ready_event.set()  # Signal LLM worker to start processing
        except Exception as e:
            print(
                f"TTS Pipeline: Error generating LLM response for new generation ID {new_gen_id}: {e}"
            )
            self.running_generation = None  # Clean up if LLM generation failed

    def process_abort_generation(self):
        """
        Handles the core logic of aborting the current generation.

        Synchronized using `abort_lock`. If a `running_generation` exists:
        1. Sets the `abortion_started` flag on the generation.
        2. Blocks new requests by clearing `abort_block_event`.
        3. Sets stop request events (`stop_llm_request_event`, `stop_tts_quick_request_event`,
           `stop_tts_final_request_event`) for active worker threads.
        4. Wakes up workers that might be waiting on start events (`generator_ready_event`,
           `llm_answer_ready_event`) so they can see the stop request.
        5. Waits (with timeouts) for each worker to acknowledge the stop by setting their
           respective `stop_..._finished_event`.
        6. Calls external cancellation methods if available (e.g., `llm.cancel_generation`).
        7. Attempts to close the LLM generator stream.
        8. Clears the `running_generation` reference.
        9. Clears stale start events (`generator_ready_event`, `llm_answer_ready_event`).
        10. Signals completion by setting `abort_completed_event`.
        11. Releases the block on new requests by setting `abort_block_event`.
        """
        # Assuming this function is called within the public abort_generation method or internally
        with self.abort_lock:
            current_gen = self.running_generation

            if current_gen is None or current_gen.abortion_started:
                if current_gen is None:
                    print("TTS Pipeline: No active generation to abort.")
                else:
                    print(
                        "TTS Pipeline: Abortion already started for current generation."
                    )

                # Ensure events are managed correctly even if redundant
                self.abort_completed_event.set()  # Signal completion if nothing to do / already done
                self.abort_block_event.set()  # Release block for new requests
                return

            # Start abort process
            print(
                f"TTS Pipeline: Starting abortion process for generation ID {current_gen.id}."
            )
            current_gen.abortion_started = True
            self.abort_block_event.clear()  # Block new requests
            self.abort_completed_event.clear()  # Reset completion event
            self.stop_everything_event.set()  # Set global stop event (although unused by workers)
            aborted_something = False

            # Abort LLM
            # Check if running or waiting to start
            is_llm_potentially_active = (
                self.llm_generation_active or self.generator_ready_event.is_set()
            )
            if is_llm_potentially_active:
                print(f"TTS Pipeline: Stopping LLM for gen {current_gen.id}.")
                self.stop_llm_request_event.set()
                self.generator_ready_event.set()  # Wake up LLM worker
                stopped = self.stop_llm_finished_event.wait(
                    timeout=5
                )  # Wait for LLM worker to finish

                if stopped:
                    print(
                        f"TTS Pipeline: LLM for gen {current_gen.id} stopped successfully."
                    )
                    self.stop_llm_finished_event.clear()  # Reset for next time
                else:
                    print(
                        f"TTS Pipeline: LLM for gen {current_gen.id} stopping timed out."
                    )
                self.llm_generation_active = False
                aborted_something = True
            else:
                print(
                    f"TTS Pipeline: LLM for gen {current_gen.id} was not running, skipping stop."
                )
            self.stop_llm_request_event.clear()  # Clear stop request for next round

            # Abort TTS Quick
            # Similar logic for TTS Quick
            is_tts_quick_potentially_active = (
                self.tts_quick_generation_active or self.llm_answer_ready_event.is_set()
            )
            if is_tts_quick_potentially_active:
                print(f"TTS Pipeline: Stopping TTS Quick for gen {current_gen.id}.")
                self.stop_tts_quick_request_event.set()
                self.llm_answer_ready_event.set()  # Wake up TTS quick worker
                stopped = self.stop_tts_quick_finished_event.wait(timeout=5)

                if stopped:
                    print(
                        f"TTS Pipeline: TTS Quick for gen {current_gen.id} stopped successfully."
                    )
                    self.stop_tts_quick_finished_event.clear()  # Reset
                else:
                    print(
                        f"TTS Pipeline: TTS Quick for gen {current_gen.id} stopping timed out."
                    )
                self.tts_quick_generation_active = False
                aborted_something = True
            else:
                print(
                    f"TTS Pipeline: TTS Quick for gen {current_gen.id} was not running, skipping stop."
                )
            self.stop_tts_quick_request_event.clear()

            # Abort TTS Final
            # Similar logic for TTS Final
            is_tts_final_potentially_active = self.tts_final_generation_active
            if is_tts_final_potentially_active:
                print(f"TTS Pipeline: Stopping TTS Final for gen {current_gen.id}.")
                self.stop_tts_final_request_event.set()
                stopped = self.stop_tts_final_finished_event.wait(timeout=5)

                if stopped:
                    print(
                        f"TTS Pipeline: TTS Final for gen {current_gen.id} stopped successfully."
                    )
                    self.stop_tts_final_finished_event.clear()
                else:
                    print(
                        f"TTS Pipeline: TTS Final for gen {current_gen.id} stopping timed out."
                    )
                self.tts_final_generation_active = False
                aborted_something = True
            else:
                print(
                    f"TTS Pipeline: TTS Final for gen {current_gen.id} was not running, skipping stop."
                )
            self.stop_tts_final_request_event.clear()

            # Clear the running generation object and close generator
            # Recheck running_generation in case it changed during the wait above
            if (
                self.running_generation is not None
                and self.running_generation.id == current_gen.id
            ):
                print(f"TTS Pipeline: Clearing running generation {current_gen.id}.")
                if current_gen.llm_generator and hasattr(
                    current_gen.llm_generator, "close"
                ):
                    try:
                        print(
                            f"TTS Pipeline: Closing LLM generator for gen {current_gen.id}."
                        )
                        current_gen.llm_generator.close()
                    except Exception as e:
                        print(
                            f"TTS Pipeline: Error closing LLM generator for gen {current_gen.id}: {e}"
                        )
                self.running_generation = None
            elif (
                self.running_generation is not None
                and self.running_generation.id != current_gen.id
            ):
                print(
                    f"TTS Pipeline: Running generation changed during abort, expected {current_gen.id}, found {self.running_generation.id}."
                )
                self.running_generation = None  # Clear stale reference
            elif aborted_something:
                print(
                    f"TTS Pipeline: Worker(s) aborted but running_generation is None."
                )
            else:
                print(
                    f"TTS Pipeline: Nothing active to abort, running_generation is None."
                )

            # Final cleanup
            # Ensure workers don't accidentally pick up stale signals if they restart quickly
            self.generator_ready_event.clear()
            self.llm_answer_ready_event.clear()

            # Signal completion
            print(
                f"TTS Pipeline: Abortion process for generation ID {current_gen.id} completed and releasing block."
            )
            self.abort_completed_event.set()  # Signal that abortion is complete
            self.abort_block_event.set()  # Release block for new requests

    # PUBLIC METHODS

    def start_threads(self):
        """
        Start worker threads for processing requests, LLM inference, and TTS synthesis.
        """
        if self.thread_started_event.is_set():
            print("TTS Pipeline: Worker threads already started, not starting again.")
            return

        def recreate_if_dead(attr_name, target, name):
            thread = getattr(self, attr_name)
            if thread is None or not thread.is_alive():
                new_thread = threading.Thread(target=target, name=name, daemon=True)
                setattr(self, attr_name, new_thread)

        recreate_if_dead(
            "request_processing_thread",
            self.__request_processing_worker,
            "RequestProcessingThread",
        )
        recreate_if_dead(
            "llm_inference_thread", self.__llm_inference_worker, "LLMProcessingThread"
        )
        recreate_if_dead(
            "tts_quick_inference_thread",
            self.__tts_quick_inference_worker,
            "TTSQuickProcessingThread",
        )
        recreate_if_dead(
            "tts_final_inference_thread",
            self.__tts_final_inference_worker,
            "TTSFinalProcessingThread",
        )

        # If havent started yet, start the threads
        if not self.request_processing_thread.is_alive():
            self.request_processing_thread.start()

        if not self.llm_inference_thread.is_alive():
            self.llm_inference_thread.start()

        if not self.tts_quick_inference_thread.is_alive():
            self.tts_quick_inference_thread.start()

        if not self.tts_final_inference_thread.is_alive():
            self.tts_final_inference_thread.start()

        print("TTS Pipeline: Worker threads are starting...")

        self.thread_started_event.set()  # Mark threads as started

        print("TTS Pipeline: Worker threads started successfully.")

    def prepare_generation(self, text: str):
        """
        Public method to request the preparation of a new speech generation.

        Queues a 'prepare' action with the provided text onto the `requests_queue`
        for the request processing worker thread.

        Args:
            text: The user input text to be synthesized.
        """
        # Threads must started before queuing requests
        if not self.thread_started_event.is_set():
            print("TTS Pipeline: Cannot queue generation, threads not started.")
            return

        print(f"TTS Pipeline: Queueing generation for text: {text}")
        self.requests_queue.put(PipelineRequest("prepare", text))

    def abort_generation(self, wait_for_completion: bool = False, timeout: float = 7.0):
        """
        Public method to initiate the abortion of the current speech generation.

        Calls the internal `process_abort_generation` method to handle the actual
        stopping of workers and cleanup. Optionally waits for the abortion to fully
        complete.

        Args:
            wait_for_completion: If True, blocks until the abort process finishes
                                 (signaled by `abort_completed_event`).
            timeout: Maximum time in seconds to wait if `wait_for_completion` is True.
            reason: A string describing why the abort was requested (for logging).
        """
        if self.shutdown_event.is_set():
            print("TTS Pipeline: Cannot abort generation, pipeline is shutting down.")
            return

        # Call the internal abort process
        self.process_abort_generation()

        # Wait for completion if set
        if wait_for_completion:
            print(
                f"TTS Pipeline: Waiting for abortion to complete (timeout={timeout}s)..."
            )
            completed = self.abort_completed_event.wait(timeout=timeout)
            if completed:
                print("TTS Pipeline: Abortion completed successfully.")
            else:
                print("TTS Pipeline: Abortion timed out before completion.")

            # Ensure block is released
            self.abort_block_event.set()

    def reset(self, clear_memory: bool = True):
        """
        Resets the pipeline state completely.

        Aborts any currently running generation (waiting for completion) and
        clears the conversation history.

        Args:
            clear_memory (bool): If True, clears the conversation memory in the LLM.
                                 Defaults to True.
        """
        print("TTS Pipeline: Resetting pipeline state.")
        self.abort_generation(wait_for_completion=True, timeout=7.0)
        self.llm.event_handler.reset()  # Reset LLM event handler

        if clear_memory:
            try:
                self.llm.clear_memory()
            except ValueError as e:
                print(
                    f"TTS Pipeline: Error clearing LLM memory: {e}. Continuing with reset."
                )
        print("TTS Pipeline: Reset complete.")

    def shutdown(self):
        """
        Initiates a graceful shutdown of the pipeline manager and worker threads.

        1. Sets the `shutdown_event`.
        2. Attempts a final abort of any running generation.
        3. Signals all relevant events to unblock any waiting worker threads.
        4. Joins each worker thread with a timeout, logging warnings if they fail to exit.
        """
        print("TTS Pipeline: Initiating shutdown.")
        self.shutdown_event.set()

        self.abort_generation(wait_for_completion=True, timeout=7.0)

        print("TTS Pipeline: Signaling all worker threads to stop.")
        self.generator_ready_event.set()
        self.llm_answer_ready_event.set()
        # Also signal 'finished' and 'completion' events
        self.stop_llm_finished_event.set()
        self.stop_tts_quick_finished_event.set()
        self.stop_tts_final_finished_event.set()
        self.abort_completed_event.set()
        self.abort_block_event.set()  # Ensure request processor isn't blocked
        self.thread_started_event.clear()  # Clear thread started event

        # Join threads
        threads_to_join = [
            (self.request_processing_thread, "Request Processor"),
            (self.llm_inference_thread, "LLM Worker"),
            (self.tts_quick_inference_thread, "TTS Quick"),
            (self.tts_final_inference_thread, "TTS Final"),
        ]

        for th, name in threads_to_join:
            if th.is_alive():
                print(f"TTS Pipeline: Joining {name} thread...")
                th.join(timeout=5)
                if th.is_alive():
                    print(
                        f"TTS Pipeline: Warning - {name} thread did not join cleanly within timeout."
                    )
            else:
                print(f"TTS Pipeline: {name} thread already finished.")

        # Clear conversation manager memory
        try:
            self.llm.clear_memory()
        except ValueError as e:
            print(f"TTS Pipeline: Error clearing LLM memory during shutdown: {e}")
        print("TTS Pipeline: Shutdown complete. All threads joined or finished.")
