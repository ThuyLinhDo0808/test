"""
The SttService class manages the core transcription logic using a third-party library (RealtimeSTT).
It handles real-time and final transcription, silence detection, and sentence end detection.

Key Responsibilities
- Audio Processing: Converts raw audio bytes into a format suitable for transcription.
- Callbacks: Exposes callbacks for real-time transcription updates, silence detection, and recording start events.
- Transcription Loop: Runs a background loop to continuously process audio chunks and feed them to the transcriber.
- Error Handling: Monitors the transcription task for errors and handles cancellations.

Interactions
- STT Service: Uses the SttService class to perform the actual transcription.
- ChatSession: Provides transcription results to the ChatSession class via callbacks.
- Audio Queue: Processes audio chunks from an asyncio.Queue provided by the ChatSession.
"""

import re
import time
import threading
from typing import Optional, List, Dict, Any, Callable
from RealtimeSTT import AudioToTextRecorder
from app.services.pipelines.utils import TextSimilarity
from app.core import (
    MAIN_STT_MODEL,
    RT_STT_MODEL,
    RT_PROCESSING_PAUSE,
    STT_SILENCE_TIMEMOUT,
    PIPELINE_LATENCY,
    DEVICE,
)


class SttService:
    """
    Manages audio transcription using RealtimeSTT, handling real-time and final
    transcription callbacks, silence detection, and potential sentence end detection.

    This class acts as a bridge between raw audio input and transcription results,
    coordinating the RealtimeSTT recorder, processing callbacks, and managing
    internal state related to silence, and potential sentences.
    """

    PIPELINE_RESERVE_TIME_MS: float = 0.02
    MIN_POTENTIAL_END_DETECTION_TIME_MS: float = 0.02
    HOT_THRESHOLD_OFFSET_S: float = 0.35
    SENTENCE_CACHE_MAX_AGE_MS: float = 0.2
    SENTENCE_CACHE_TRIGGER_COUNT: int = 3
    END_MARKS: List[str] = [".", "!", "?", "。"]
    MAX_CACHE_SIZE: int = 100
    MAX_YIELDED_SIZE = 50

    def __init__(self):
        """
        Initializes the STT service with a RealtimeSTT recorder and sets up
        various callbacks for real-time transcription, final transcription, and
        """
        self.text_similarity = TextSimilarity(focus="end", n_words=5)

        # Callbacks to expose to frontend
        self.realtime_transcription_callback: Optional[Callable[[str], None]] = None
        self.full_transcription_callback: Optional[Callable[[str], None]] = None
        self.potential_full_transcription_callback: Optional[Callable[[str], None]] = (
            None
        )
        self.potential_full_transcription_abort_callback: Optional[
            Callable[[], None]
        ] = None
        self.potential_sentence_end_callback: Optional[Callable[[str], None]] = None
        self.before_final_sentence_callback: Optional[Callable[[str], bool]] = None
        self.silence_active_callback: Optional[Callable[[bool], None]] = None
        self.on_recording_start_callback: Optional[Callable[[], None]] = None

        # Values
        self.pipeline_latency: float = PIPELINE_LATENCY
        self.realtime_text: Optional[str] = None
        self.sentence_end_cache: List[Dict[str, Any]] = []
        self.potential_sentences_yielded: List[Dict[str, Any]] = []
        self.stripped_partial_user_text: str = ""
        self.final_transcription: Optional[str] = None
        self.shutdown_performed: bool = False
        self.silence_time: float = 0.0
        self.silence_active: bool = False

        self.recorder: Optional[AudioToTextRecorder] = None
        self.__create_recorder()
        self.monitor_thread: Optional[threading.Thread] = None
        # self.__start_silence_monitor()

    def __is_recorder_recording(self) -> bool:
        """
        Checks if the recorder is currently recording.

        Returns:
            bool: True if the recorder is actively recording audio, False otherwise.
        """
        return self.recorder.is_recording

    def __set_silence(self, silence_active: bool) -> None:
        """
        Updates the internal silence state and triggers the silence_active_callback.

        Args:
            silence_active: The new silence state (True if silence is now active).
        """
        if self.silence_active != silence_active:
            self.silence_active = silence_active
            print(f"STT Service: Silence state changed: {self.silence_active}")
            if self.silence_active_callback:
                self.silence_active_callback(silence_active)

    def __strip_ending_punctuation(self, text: str) -> str:
        """
        Removes trailing punctuation marks defined in `sentence_end_marks`.

        Removes trailing whitespace first, then iteratively removes any characters
        from `sentence_end_marks` found at the end of the string.

        Args:
            text: The input text string.

        Returns:
            The text string with specified trailing punctuation removed.
        """
        text = text.rstrip()
        for char in self.END_MARKS:
            # Repeatedly strip each punctuation mark in case of multiples (e.g., "!!")
            while text.endswith(char):
                text = text.rstrip(char)
        return text  # Return the stripped text

    def __create_recorder(self) -> None:
        """
        Initializes the RealtimeSTT recorder
        """

        # Define callbacks locally to capture `self`
        def start_silence_detection():
            """Callback triggered when recorder detects start of silence (end of speech)."""
            self.__set_silence(True)
            # Capture silence start time immediately. Use recorder's time if available.
            recorder_silence_start = self.recorder.speech_end_silence_start
            self.silence_time = (
                recorder_silence_start if recorder_silence_start else time.time()
            )
            print(
                f"STT Service: Silence detected (start_silence_detection called). Silence time set to: {self.silence_time}"
            )

        def stop_silence_detection():
            """Callback triggered when recorder detects end of silence (start of speech)."""
            self.__set_silence(False)
            self.silence_time = 0.0  # Reset silence time
            print("STT Service: Silence ended (stop_silence_detection called).")

        def start_recording():
            """Callback triggered when recorder starts a new recording segment."""
            print("STT Service: Recording started.")
            self.__set_silence(False)
            self.silence_time = 0.0  # Reset silence time
            if self.on_recording_start_callback:
                self.on_recording_start_callback()

        def stop_recording() -> bool:
            """
            Callback triggered when recorder stops a recording segment, just
            before final transcription might be generated.
            """
            print("STT Service: Recording stopped.")

            if self.before_final_sentence_callback:
                try:
                    print("STT Service: Triggering before_final_sentence_callback.")
                    result = self.before_final_sentence_callback(self.realtime_text)
                    return result if isinstance(result, bool) else False
                except Exception as e:
                    print(f"STT Service: Error in before_final_sentence_callback: {e}")
                    return False
            return False  # Indicate no action taken if callback doesn't exist or doesn't return True

        def on_partial(text: Optional[str]) -> None:
            """Callback triggered for real-time transcription updates."""
            if text is None:
                return
            self.realtime_text = text  # Update the real-time text

            # Detect potential sentence ends based on punctuation stability
            self.detect_potential_sentence_end(text)

            stripped_partial_user_text_new = self.__strip_ending_punctuation(text)

            if stripped_partial_user_text_new != self.stripped_partial_user_text:
                self.stripped_partial_user_text = stripped_partial_user_text_new
                print(
                    f"STT Service: Partial transcription text: {self.stripped_partial_user_text}"
                )
                if self.realtime_transcription_callback:
                    self.realtime_transcription_callback(text)
            else:
                print(
                    f"STT Service: Partial transcription text (No change after strip): {self.stripped_partial_user_text}"
                )

        self.recorder = AudioToTextRecorder(
            model=MAIN_STT_MODEL,
            realtime_model_type=RT_STT_MODEL,
            realtime_processing_pause=RT_PROCESSING_PAUSE,
            post_speech_silence_duration=STT_SILENCE_TIMEMOUT,
            on_realtime_transcription_update=on_partial,
            on_turn_detection_start=start_silence_detection,
            on_turn_detection_stop=stop_silence_detection,
            on_recording_start=start_recording,
            on_recording_stop=stop_recording,
            use_microphone=False,
            spinner=False,
            use_main_model_for_realtime=False,
            language="en",
            silero_sensitivity=0.05,
            webrtc_sensitivity=3,
            min_length_of_recording=0.5,
            min_gap_between_recordings=0,
            enable_realtime_transcription=True,
            silero_use_onnx=True,
            silero_deactivity_detection=True,
            early_transcription_on_silence=0,
            beam_size=3,
            beam_size_realtime=3,
            no_log_file=True,
            # wake_words="jarvis", # Implement later
            # wakeword_backend="pvporcupine", #
            allowed_latency_limit=500,
            initial_prompt_realtime="The sky is blue. When the sky... She walked home. Because he... Today is sunny. If only I...",
            faster_whisper_vad_filter=False,
            device=DEVICE,
        )

    def __start_silence_monitor(self) -> None:
        """
        Starts a background thread to monitor silence duration and trigger
        events like potential sentence end detection, TTS synthesis allowance,
        and potential full transcription ("hot") state changes.
        """

        def monitor():
            hot = False

            # Initialize silence time
            self.silence_time = self.recorder.speech_end_silence_start

            while not self.shutdown_performed:
                speech_end_silence_start = self.silence_time

                if (
                    self.recorder
                    and speech_end_silence_start is not None
                    and speech_end_silence_start != 0
                ):
                    silence_waiting_time = self.recorder.post_speech_silence_duration
                    time_since_silence = time.time() - speech_end_silence_start

                    # Calculate latest time pipeline can start without exceeding silence duration
                    latest_pipe_start_time = (
                        silence_waiting_time
                        - self.pipeline_latency
                        - self.PIPELINE_RESERVE_TIME_MS
                    )

                    # Calculate the target time to trigger potential sentence end detection
                    potential_sentence_end_time = latest_pipe_start_time

                    # Ensure we don't trigger too early
                    if (
                        potential_sentence_end_time
                        < self.MIN_POTENTIAL_END_DETECTION_TIME_MS
                    ):
                        potential_sentence_end_time = (
                            self.MIN_POTENTIAL_END_DETECTION_TIME_MS
                        )

                    # Determine the threshold time to enter hot state
                    start_hot_condition_time = (
                        silence_waiting_time - self.HOT_THRESHOLD_OFFSET_S
                    )
                    # Ensure the hot condition has a minimum meaningful duration
                    if (
                        start_hot_condition_time
                        < self.MIN_POTENTIAL_END_DETECTION_TIME_MS
                    ):
                        start_hot_condition_time = (
                            self.MIN_POTENTIAL_END_DETECTION_TIME_MS
                        )

                    # Trigger actions based on timing

                    # Force potential sentence end detection if time has passed
                    if time_since_silence > potential_sentence_end_time:
                        # Check if realtime_text exists before logging/detecting
                        current_text = self.realtime_text or ""
                        print(
                            f"STT Service: Potential sentence end detected: {current_text}"
                        )
                        self.detect_potential_sentence_end(
                            current_text, force_yield=True, force_ellipses=True
                        )

                    # Handle "Hot" state (potential full transcription)
                    hot_condition_met = time_since_silence > start_hot_condition_time
                    if hot_condition_met and not hot:
                        hot = True
                        print(
                            "STT Service: Hot condition met, potential full transcription allowed."
                        )
                        if self.potential_full_transcription_callback:
                            self.potential_full_transcription_callback(
                                self.realtime_text
                            )

                    elif not hot_condition_met and hot:
                        # Transitioning from Hot to Cold while still in silence period (e.g., silence_waiting_time changed)
                        if self.__is_recorder_recording():  # Check if still recording
                            print(
                                "STT Service: Hot condition ended, potential full transcription disallowed."
                            )
                            if self.potential_full_transcription_abort_callback:
                                self.potential_full_transcription_abort_callback()
                        hot = False

                elif (
                    hot
                ):  # Exited silence period (speech_end_silence_start is 0 or None)
                    # If we were hot, but silence ended (e.g., new speech started), transition to cold
                    if self.__is_recorder_recording():  # Check if restarted
                        print(
                            "STT Service: Silence ended, transitioning from Hot to Cold state."
                        )
                        if self.potential_full_transcription_abort_callback:
                            self.potential_full_transcription_abort_callback()

                    hot = False

                time.sleep(0.001)  # Prevent busy-waiting

        self.monitor_thread = threading.Thread(target=monitor, daemon=True)
        # self.monitor_thread.start()

    def __normalize_text(self, text: str) -> str:
        """
        Internal helper to normalize text for comparison purposes.
        Converts to lowercase, removes non-alphanumeric characters (except spaces),
        and collapses extra whitespace.

        Args:
            text: The input string to normalize.

        Returns:
            The normalized string.
        """
        text = text.lower()
        # Remove all non-alphanumeric characters (keeping spaces)
        text = re.sub(r"[^a-z0-9\s]", "", text)  # Keep spaces for SequenceMatcher
        # Remove extra whitespace and trim
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def __is_the_same(
        self, text1: str, text2: str, similarity_threshold: float = 0.96
    ) -> bool:
        """
        Checks if two text strings are highly similar, focusing on the ending words.
        Uses the internal TextSimilarity instance.

        Args:
            text1: The first text string.
            text2: The second text string.
            similarity_threshold: The minimum similarity score (0 to 1) to consider
                                  the texts the same.

        Returns:
            True if the similarity score exceeds the threshold, False otherwise.
        """
        # Use the dedicated TextSimilarity class instance
        similarity = self.text_similarity.calculate_similarity(text1, text2)
        return similarity > similarity_threshold

    def transcribe_loop(self) -> None:
        """
        Sets up the final transcription callback mechanism with the recorder.

        This method defines the `on_final` callback that will be invoked by the
        recorder when a complete utterance transcription is available. It then
        registers this callback with the recorder instance.
        """

        def on_final(text: Optional[str]) -> None:
            if text is None or text == "":
                print("STT Service: Final transcription is empty, skipping.")
                return

            self.final_transcription = text
            print(
                f"STT Service: Final transcription received: {self.final_transcription}"
            )

            self.sentence_end_cache.clear()  # Clear cache on new final transcription
            self.potential_sentences_yielded.clear()

            if self.full_transcription_callback:
                self.full_transcription_callback(text)

        self.recorder.text(on_final)

    def abort_generation(self):
        """
        Clears the cache of potentially yielded sentences.

        This effectively stops any further actions that might be triggered based
        on previously detected potential sentence ends, useful if processing needs
        to be reset or interrupted externally.
        """
        self.potential_sentences_yielded.clear()
        print("STT Service: Aborted generation, cleared potential sentences cache.")

    def detect_potential_sentence_end(
        self,
        text: Optional[str],
        force_yield: bool = False,
        force_ellipses: bool = False,
    ) -> None:
        """
        Detects potential sentence endings based on ending punctuation and timing stability.

        Checks if the provided text ends with sentence-ending punctuation (., !, ?).
        If so, it caches the normalized text and its timestamp. If the same normalized
        text ending appears frequently within a short time window or if `force_yield`
        is True (e.g., due to silence timeout), it triggers the `potential_sentence_end`
        callback, avoiding redundant triggers for the same sentence.

        Args:
            text: The real-time transcription text to check.
            force_yield: If True, bypasses punctuation and timing checks and forces
                         triggering the callback (if text is valid and not already yielded).
            force_ellipses: If True (used with `force_yield`), allows "..." to be
                            considered a sentence end.
        """
        if not text:
            return

        stripped_text_raw = text.strip()
        if not stripped_text_raw:
            return

        # Don't consider ellipses as sentence end unless forced
        if stripped_text_raw.endswith("...") and not force_ellipses:
            return

        now = time.time()

        # Only proceed if text ends with a standard punctuation mark or if forced
        ends_with_punctuation = any(
            stripped_text_raw.endswith(p) for p in self.END_MARKS
        )
        if not ends_with_punctuation and not force_yield:
            return

        normalized_text = self.__normalize_text(stripped_text_raw)
        if not normalized_text:
            return

        entry_found = None
        for entry in self.sentence_end_cache:
            # Check if the normalized text matches an existing entry
            if self.__is_the_same(entry["text"], normalized_text):
                entry_found = entry
                break

        if entry_found:
            entry_found["timestamps"].append(now)
            # Keep only recent timestamps within the max age limit
            entry_found["timestamps"] = [
                t
                for t in entry_found["timestamps"]
                if now - t <= self.SENTENCE_CACHE_MAX_AGE_MS
            ]
        else:
            # Add new entry
            entry_found = {"text": normalized_text, "timestamps": [now]}
            self.sentence_end_cache.append(entry_found)

            # Limit cache size to avoid memory bloat
            if len(self.sentence_end_cache) > self.MAX_CACHE_SIZE:
                self.sentence_end_cache.pop(0)

        # Yielding logic
        should_yield = False
        if force_yield:
            should_yield = True
        elif (
            ends_with_punctuation
            and len(entry_found["timestamps"]) >= self.SENTENCE_CACHE_TRIGGER_COUNT
        ):
            should_yield = True

        if should_yield:
            # Check if this text has already been yielded
            already_yielded = False
            for yielded_entry in self.potential_sentences_yielded:
                if self.__is_the_same(yielded_entry["text"], normalized_text):
                    already_yielded = True
                    break

            if not already_yielded:
                self.potential_sentences_yielded.append(
                    {"text": normalized_text, "timestamp": now}
                )
                # Limit yielded sentences cache size
                if len(self.potential_sentences_yielded) > self.MAX_YIELDED_SIZE:
                    self.potential_sentences_yielded.pop(0)

                print(
                    f"STT Service: Yielding potential sentence end detected: {normalized_text}"
                )
                if self.potential_sentence_end_callback:
                    self.potential_sentence_end_callback(stripped_text_raw)

    def feed_audio(self, chunk: bytes) -> None:
        """
        Feeds an audio chunk to the underlying recorder instance for processing.

        Args:
            chunk: A bytes object containing the raw audio data chunk.
        """
        if not self.shutdown_performed:
            self.recorder.feed_audio(chunk)
        else:
            print("STT Service: Cannot feed audio, service has been shut down.")

    def shutdown(self) -> None:
        """
        Shuts down the recorder instance, cleans up resources, and prevents
        further processing. Sets the `shutdown_performed` flag.
        """
        if not self.shutdown_performed:
            print("STT Service: Shutting down.")
            self.shutdown_performed = True
            self.recorder.shutdown()  # Shutdown the recorder
            self.recorder = None

            # Stop the thread if exists
            if self.monitor_thread and self.monitor_thread.is_alive():
                self.monitor_thread.join(timeout=1)
            else:
                print("STT Service: No monitor thread to shut down.")

            if self.monitor_thread and self.monitor_thread.is_alive():
                print("STT Service: Monitor thread did not shut down cleanly.")
            else:
                print("STT Service: Monitor thread shut down successfully.")

            print("STT Service: Shutdown complete.")
        else:
            print("STT Service: Shutdown already performed, ignoring subsequent calls.")

    def start(self) -> None:
        """
        Starts the service. This include starting the monitor thread and setting flags
        """
        if self.shutdown_performed or self.shutdown_performed:
            # If is shutdown, start the service again
            if not self.recorder:
                self.__create_recorder()  # Create the recorder if not already created

            # Check if the silence monitor is already running
            if not self.monitor_thread or not self.monitor_thread.is_alive():
                self.__start_silence_monitor()  # Restart the silence monitor
                # Start the monitor thread
                self.monitor_thread.start()

            self.shutdown_performed = False
        else:
            print("STT Service: Service is already running, skipping.")
