"""
The TtsService class handles the text-to-speech synthesis process using the KokoroEngine.
It manages audio buffering, chunking, and playback timing.

Key Responsibilities
- Audio Synthesis: Converts text into audio using the KokoroEngine.
- Buffer Management: Ensures smooth playback by managing audio chunks in a buffer.
- Callbacks: Provides callbacks for word timing and the first audio chunk.

Interactions
- TTS Pipeline: Provides synthesized audio chunks to the TtsPipeline.
- KokoroEngine: Uses the KokoroEngine for TTS synthesis.
- ChatSession: Sends audio chunks to the ChatSession for playback.
"""

import time
import asyncio
import threading
from queue import Queue
from typing import Callable, Generator, Optional
import numpy as np
import torch
from scipy.signal import resample_poly
from app.core import SAMPLE_RATE, BYTES_PER_SAMPLE
from app.services.pipelines.tts_engine import KokoroEngine
from app.models import TimingInfo


class BufferManager:
    def __init__(
        self,
        chunk_queue: Queue,
        stop_event: threading.Event,
        sample_rate: int,
        bytes_per_sample: int,
        tolerance: float = 0.1,
    ):
        """
        BufferManager for managing audio chunks and ensuring smooth playback.

        Args:
            chunk_queue (Queue): Queue to hold audio chunks for playback.
            stop_event (threading.Event): Event to signal when processing should stop.
            sample_rate (int): Sample rate of the audio.
            bytes_per_sample (int): Number of bytes per sample in the audio data.
            tolerance (float, optional): Tolerance for buffering good streak. Defaults to 0.1.
        """
        self.queue = chunk_queue
        self.stop_event = stop_event
        self.sample_rate = sample_rate
        self.bytes_per_sample = bytes_per_sample
        self.tolerance = tolerance

        self.first_call = True
        self.callback_fired = False
        self.buffer = []
        self.buf_duration = 0.0
        self.good_streak = 0
        self.last_time = 0.0
        self.on_first_chunk: Optional[Callable] = None

    def process_chunk(self, chunk: bytes) -> bool:
        """
        Process an audio chunk, managing the buffer and playback timing.

        Args:
            chunk (bytes): Audio chunk to process.

        Returns:
            bool: True if the chunk was successfully processed, False if stop event is set.
        """
        if self.stop_event.is_set():
            return False

        now = time.time()
        samples = len(chunk) // self.bytes_per_sample
        play_duration = samples / self.sample_rate

        if self.first_call:
            self.first_call = False
        else:
            gap = now - self.last_time
            if gap <= play_duration * self.tolerance:
                self.good_streak += 1
            else:
                self.good_streak = 0

        self.last_time = now
        self.buffer.append(chunk)
        self.buf_duration += play_duration

        put_occurred = False
        if self.good_streak >= 2 or self.buf_duration > 0.5:
            for c in self.buffer:
                self.queue.put_nowait(c)
                put_occurred = True
            self.buffer.clear()
            self.buf_duration = 0.0
        else:
            self.queue.put_nowait(chunk)
            put_occurred = True

        if put_occurred and not self.callback_fired:
            if self.on_first_chunk:
                try:
                    self.on_first_chunk()
                except Exception as e:
                    print(f"TTS Buffer Manager: Error in on_first_chunk callback: {e}")
            self.callback_fired = True

        return True

    def flush(self):
        """
        Flush the buffer, sending all remaining audio chunks to the queue.
        """
        for c in self.buffer:
            try:
                self.queue.put_nowait(c)
            except asyncio.QueueFull:
                print(
                    "TTS Buffer Manager: Audio chunks queue is full on flush, skipping chunk"
                )
        self.buffer.clear()


class TtsService:
    """
    Service for handling text-to-speech synthesis using Kokoro TTS engine.
    This service manages audio synthesis, buffering, and chunking for efficient playback.
    It supports both synchronous and asynchronous synthesis methods.

    """

    QUICK_ANSWER_STREAM_CHUNK_SIZE = 8
    TOLERANCE = 0.1  # Tolerance for gap detection in seconds

    def __init__(self):
        """
        Initialize the TTS service, setting up necessary attributes and prewarming the engine.
        """
        self.finished_event = threading.Event()
        self.current_stream_chunk_size = self.QUICK_ANSWER_STREAM_CHUNK_SIZE
        self.prewarmed = False

        self.on_first_audio_chunk_synthesize: Optional[Callable] = None

        # Use new KokoroEngine
        self.engine = KokoroEngine()

        # Optional external callbacks to expose
        self.on_word_callback: Optional[Callable[[TimingInfo], None]] = None

        self.__prewarm()

    def __prewarm(self):
        """
        Prewarm the TTS engine to ensure it is ready for use.
        """
        gen = self.engine.synthesize("Prewarming !")
        for _ in gen:
            pass
        self.prewarmed = True
        print("TTS engine prewarmed successfully.")

    def synthesize_text(
        self, text: str, audio_chunks: Queue, stop_event: threading.Event
    ) -> bool:
        """
        Synthesize audio from a given text string and manage the audio chunks.

        Args:
            text (str): Text to synthesize.
            audio_chunks (Queue): Queue to hold audio chunks for playback.
            stop_event (threading.Event): Event to signal when processing should stop.

        Returns:
            bool: True if synthesis was successful, False if stopped.
        """
        self.finished_event.clear()

        buffer_manager = BufferManager(
            chunk_queue=audio_chunks,
            stop_event=stop_event,
            sample_rate=SAMPLE_RATE,
            bytes_per_sample=BYTES_PER_SAMPLE,
            tolerance=self.TOLERANCE,
        )
        buffer_manager.on_first_chunk = self.on_first_audio_chunk_synthesize

        gen = self.engine.synthesize(text)
        for chunk in gen:
            if stop_event.is_set():
                self.engine.stop()
                self.finished_event.set()
                return False
            if chunk is None:
                break

            if hasattr(chunk, "audio"):
                pcm_bytes = self.__convert_tensor_to_pcm_bytes(chunk.audio)
                buffer_manager.process_chunk(pcm_bytes)

            if hasattr(chunk, "tokens") and self.on_word_callback:
                for token in chunk.tokens:
                    if hasattr(token, "start_ts") and hasattr(token, "end_ts"):
                        timing = TimingInfo(
                            grapheme=token.text,
                            phoneme=token.phonemes,
                            start=token.start_ts,
                            end=token.end_ts,
                        )
                        self.on_word_callback(timing)
                    else:
                        print(
                            f"TTS Service: Skipping token with missing timing info: {token.text}"
                        )

        if not stop_event.is_set():
            buffer_manager.flush()

        self.finished_event.set()
        return True

    def __convert_tensor_to_pcm_bytes(self, tensor: torch.Tensor) -> bytes:
        """
        Converts a float32 torch.Tensor or numpy array [-1, 1] to 16-bit PCM bytes.
        """
        if isinstance(tensor, torch.Tensor):
            tensor = tensor.detach().cpu().numpy()

        if not isinstance(tensor, np.ndarray):
            raise ValueError("Expected torch.Tensor or np.ndarray")

        tensor = np.clip(tensor, -1.0, 1.0)  # Safety clip

        upsampled = resample_poly(tensor, up=2, down=1)

        int16 = (upsampled * 32767).astype(np.int16)
        return int16.tobytes()

    def synthesize_generator(
        self,
        generator: Generator[str, None, None],
        audio_chunks: Queue,
        stop_event: threading.Event,
    ) -> bool:
        """
        Synthesize audio from a generator of text strings and manage the audio chunks.

        Args:
            generator (Generator[str, None, None]): Generator yielding text strings.
            audio_chunks (Queue): Queue to hold audio chunks for playback.
            stop_event (threading.Event): Event to signal when processing should stop.

        Returns:
            bool: True if synthesis was successful, False if stopped.
        """
        self.finished_event.clear()

        buffer_manager = BufferManager(
            chunk_queue=audio_chunks,
            stop_event=stop_event,
            sample_rate=SAMPLE_RATE,
            bytes_per_sample=BYTES_PER_SAMPLE,
            tolerance=self.TOLERANCE,
        )
        buffer_manager.on_first_chunk = self.on_first_audio_chunk_synthesize

        gen = self.engine.synthesize(generator)
        for chunk in gen:
            if stop_event.is_set():
                self.engine.stop()
                self.finished_event.set()
                return False
            if chunk is None:
                break

            if hasattr(chunk, "audio"):
                pcm_bytes = self.__convert_tensor_to_pcm_bytes(chunk.audio)
                buffer_manager.process_chunk(pcm_bytes)

            if hasattr(chunk, "tokens") and self.on_word_callback:
                for token in chunk.tokens:
                    if hasattr(token, "start_ts") and hasattr(token, "end_ts"):
                        timing = TimingInfo(
                            grapheme=token.text,
                            phoneme=token.phonemes,
                            start=token.start_ts,
                            end=token.end_ts,
                        )
                        self.on_word_callback(timing)
                    else:
                        print(
                            f"TTS Service: Skipping token with missing timing info: {token.text}"
                        )

        if not stop_event.is_set():
            buffer_manager.flush()

        self.finished_event.set()
        return True
