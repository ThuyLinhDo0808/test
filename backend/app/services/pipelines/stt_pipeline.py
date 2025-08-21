"""
The SttPipeline class handles real-time speech-to-text transcription.
It processes audio chunks, resamples them, and interacts with the SttService for transcription.

Key Responsibilities:
- Audio Processing: Converts raw audio bytes into a format suitable for transcription.
- Callbacks: Exposes callbacks for real-time transcription updates, silence detection, and recording start events.
- Transcription Loop: Runs a background loop to continuously process audio chunks and feed them to the transcriber.
- Error Handling: Monitors the transcription task for errors and handles cancellations.

Interactions
- STT Service: Uses the SttService class to perform the actual transcription.
- ChatSession: Provides transcription results to the ChatSession class via callbacks.
- Audio Queue: Processes audio chunks from an asyncio.Queue provided by the ChatSession.
"""

import asyncio
import numpy as np
from scipy.signal import resample_poly
from typing import Optional, Callable
from app.services.pipelines.stt_service import SttService


class SttPipeline:
    """
    Pipeline for handling real-time speech-to-text (STT) transcription.
    This class manages the transcription process, including audio chunk processing,
    resampling, and handling callbacks for real-time updates.
    It uses an instance of `SttService` to perform the actual transcription work.
    """

    RESAMPLE_RATIO = 3  # Resample ratio from 48kHz (assumed input) to 16kHz.

    def __init__(self, transcriber: SttService):
        """
        Initializes the STT Pipeline with a transcriber service.

        Args:
            transcriber (SttService): An instance of SttService that handles the actual transcription logic.
        """
        self.last_partial_text: Optional[str] = None
        self.transcriber = transcriber
        self.transcriber.on_recording_start_callback = self.__on_recording_start
        self.transcriber.silence_active_callback = self.__silence_active_callback

        # Flags
        self.transcription_failed: bool = False

        self.transcription_task: Optional[asyncio.Task] = None

        # Callbacks to expose to frontend
        self.realtime_callback: Optional[Callable[[str], None]] = None
        self.recording_start_callback: Optional[Callable[[], None]] = None
        self.silence_active_callback: Optional[Callable[[bool], None]] = None
        self.interrupted: bool = False

        self.__setup_callbacks()

    def __silence_active_callback(self, is_active: bool) -> None:
        """Internal callback relay for silence detection status."""
        if self.silence_active_callback:
            self.silence_active_callback(is_active)

    def __on_recording_start(self) -> None:
        """Internal callback relay triggered when the transcriber starts recording."""
        if self.recording_start_callback:
            self.recording_start_callback()

    def abort_generation(self) -> None:
        """Signals the underlying transcriber to abort any ongoing generation process."""
        print("STT Pipeline: Aborting generation.")
        self.transcriber.abort_generation()

    def __setup_callbacks(self) -> None:
        """Sets up internal callbacks."""

        def partial_transcript_callback(text: str) -> None:
            """Handles partial transcription results from the transcriber."""
            if text != self.last_partial_text:
                self.last_partial_text = text
                if self.realtime_callback:
                    self.realtime_callback(text)

        self.transcriber.realtime_transcription_callback = partial_transcript_callback

    async def run_transcription_loop(self) -> None:
        """
        Continuously runs the transcription loop in a background asyncio task.

        It repeatedly calls the underlying `transcribe_loop`. If `transcribe_loop`
        finishes normally (completes one cycle), this loop calls it again.
        If `transcribe_loop` raises an Exception, it's treated as a fatal error,
        a flag is set, and this loop terminates. Handles CancelledError separately.
        """
        print("STT Pipeline: Starting transcription loop.")
        while True:
            try:
                # Run one cycle
                await asyncio.to_thread(self.transcriber.transcribe_loop)
                # If transcribe_loop returns without error, it means one cycle is complete.
                await asyncio.sleep(0.1)  # Small delay to prevent busy-waiting
            except asyncio.CancelledError:
                print("STT Pipeline: Transcription loop cancelled.")
                break
            except Exception as e:
                # This is for unexpected errors in the transcription loop.
                # Any error here is because of RealtimeSTT, not the wrapper itself as the function does not raise exceptions.
                print(f"STT Pipeline: Fatal error in transcription loop: {e}")
                self.transcription_failed = True
                break

        print("STT Pipeline: Transcription loop terminated.")

    def __process_audio_chunk(self, raw_bytes: bytes) -> np.ndarray:
        """
        Converts raw audio bytes (int16) to a 16kHz 16-bit PCM numpy array.

        The audio is converted to float32 for accurate resampling and then
        converted back to int16, clipping values outside the valid range.

        Args:
            raw_bytes: Raw audio data assumed to be in int16 format.

        Returns:
            A numpy array containing the resampled audio in int16 format at 16kHz.
            Returns an array of zeros if the input is silent.
        """
        raw_audio = np.frombuffer(raw_bytes, dtype=np.int16)

        if np.max(np.abs(raw_audio)) == 0:
            # Calculate expected length after resampling for silence
            expected_len = int(np.ceil(len(raw_audio) / self.RESAMPLE_RATIO))
            return np.zeros(expected_len, dtype=np.int16)

        # Convert to float32 for resampling precision
        audio_float32 = raw_audio.astype(np.float32)

        # Resample using float32 data
        resampled_float = resample_poly(audio_float32, 1, self.RESAMPLE_RATIO)

        # Convert back to int16, clipping to ensure validity
        resampled_int16 = np.clip(resampled_float, -32768, 32767).astype(np.int16)

        return resampled_int16

    async def process_chunk_queue(self, audio_queue: asyncio.Queue) -> None:
        """
        Continuously processes audio chunks received from an asyncio Queue.

        Retrieves audio data, processes it using `process_audio_chunk`, and
        feeds the result to the transcriber unless interrupted or the transcription
        task has failed. Stops when `None` is received from the queue or upon error.

        Args:
            audio_queue: An asyncio queue expected to yield dictionaries containing
                         'pcm' (raw audio bytes) or None to terminate.
        """

        print("STT Pipeline: Starting to process audio chunks.")

        while True:
            try:
                if self.transcription_failed:
                    print(
                        "STT Pipeline: Transcription backend failed previously, stopping processing."
                    )
                    break  # Stop processing if transcription backend is down

                # Check if the task finished unexpectedly (e.g., cancelled but not failed)
                # Needs to check self.transcription_task existence as it might be None during shutdown
                if (
                    self.transcription_task
                    and self.transcription_task.done()
                    and not self.transcription_failed
                ):
                    # Attempt to check exception status if task is done
                    task_exception = self.transcription_task.exception()
                    if task_exception and not isinstance(
                        task_exception, asyncio.CancelledError
                    ):
                        print(
                            f"STT Pipeline: Transcription task failed with unexpected error: {task_exception}"
                        )
                        self.transcription_failed = True
                        break

                    else:
                        # Finished cleanly or was cancelled
                        print(
                            "STT Pipeline: Transcription task finished cleanly or was cancelled."
                        )
                        break

                audio_data = await audio_queue.get()
                if audio_data is None:
                    print(
                        "STT Pipeline: Received termination signal from audio queue, stopping processing."
                    )
                    break  # Stop processing if None is received

                pcm_data = audio_data.get("pcm")
                processed = self.__process_audio_chunk(pcm_data)

                if processed.size == 0:
                    continue  # Skip empty chunks

                # Feed audio only if not interrupted and transcriber should be running
                if not self.interrupted:
                    # Check failure flag as it might have been set during processing
                    if not self.transcription_failed:
                        self.transcriber.feed_audio(processed.tobytes())
            except asyncio.CancelledError:
                print("STT Pipeline: Audio processing cancelled.")
                break
            except Exception as e:
                print(f"STT Pipeline: Error processing audio chunk: {e}")
                break

        print("STT Pipeline: Stopping audio processing loop.")

    def shutdown(self) -> None:
        """
        Shuts down the STT pipeline, cancelling any ongoing transcription tasks
        """
        print("STT Pipeline: Shutting down.")

        self.transcriber.shutdown()

        if self.transcription_task and not self.transcription_task.done():
            print("STT Pipeline: Cancelling transcription task.")
            self.transcription_task.cancel()

        self.transcription_task = None

        print("STT Pipeline: Shutdown complete.")

    def start(self) -> None:
        """
        Starts the transcription process by initializing the transcriber and
        processing audio chunks from the provided queue.

        Args:
            audio_queue (asyncio.Queue): An asyncio queue that provides audio chunks
                                         for transcription.
        """
        # Start the transcriber
        self.transcriber.start()

        if self.transcription_task is None or self.transcription_task.done():
            print("STT Pipeline: Starting transcription task.")

            self.transcription_task = asyncio.create_task(self.run_transcription_loop())
