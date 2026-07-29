"""
The KokoroEngine class is a wrapper around the KPipeline library for text-to-speech synthesis.
It handles text processing, audio generation, and streaming.

Key Responsibilities
- Text Processing: Splits text into manageable chunks for synthesis.
- Audio Generation: Generates audio from text using the KPipeline.
- Streaming: Streams audio chunks to the TtsService.

Interactions
- TTS Service: Provides audio chunks to the TtsService for buffering and playback
"""

import re
import time
import threading
from queue import Queue, Empty
from typing import Generator, Optional, Union
from kokoro import KPipeline
from app.core import DEVICE, SPEED, VOICE, LANG_CODE


class KokoroEngine:
    """
    Kokoro TTS engine wrapper for handling text-to-speech synthesis.
    Uses KPipeline for processing text and generating audio.
    """

    REPO_ID: str = "hexgrad/Kokoro-82M"
    SENTENCE_DETER_TIMEOUT: float = (
        0.5  # Time to wait before flushing unpunctuated text
    )
    # If this is too long it will cause the engine to wait for too long before flushing unpunctuated text
    # This doesn't seem to always happen, might be depending on the LLM generation as well
    MIN_FLUSH_LEN: int = 8

    def __init__(
        self,
        lang_code: str = LANG_CODE,
        voice: str = VOICE,
        speed: float = SPEED,
    ):
        """
        Initialize the Kokoro TTS engine with default parameters.
        Sets up the pipeline and default voice and speed.

        Args:
            lang_code (str): Language code for the TTS engine.
            voice (str): Voice to use for synthesis.
            speed (float): Speed of the speech synthesis.
        """
        self.pipeline = KPipeline(lang_code, self.REPO_ID, device=DEVICE)
        self.voice = voice
        self.speed = speed

        self.__playing_lock = threading.Lock()
        self.__playing = False
        self.on_audio_stream_stop = None

        self._stop_event = threading.Event()
        self._stream_thread: Optional[threading.Thread] = None

    def set_speed(self, speed: float):
        """
        Set the speed for the TTS engine.

        Args:
            speed (float): The speed of the speech synthesis.
        """
        self.speed = speed
        print(f"TTS Engine: Speed set to {self.speed}")

    def set_voice(self, voice: str):
        """
        Set the voice for the TTS engine.

        Args:
            voice (str): The voice to use for synthesis.
        """
        self.voice = voice
        print(f"TTS Engine: Voice set to {self.voice}")

    def is_playing(self) -> bool:
        """
        Check if the TTS engine is currently playing audio.
        This is thread-safe and uses a lock to ensure consistent state.

        Returns:
            bool: True if the engine is playing audio, False otherwise.
        """
        with self.__playing_lock:
            return self.__playing

    def __set_playing(self, value: bool):
        """
        Set the playing state of the TTS engine.

        Args:
            value (bool): True to set the engine as playing, False to stop it.
        """
        print(f"TTS Engine: Setting playing state to {value}")
        with self.__playing_lock:
            self.__playing = value

    def stop(self):
        """
        Stop the TTS synthesis and set the stop event.
        This will interrupt any ongoing synthesis and stop the audio stream.
        """
        print("Stopping TTS synthesis...")
        self._stop_event.set()

    def synthesize(
        self, text_or_gen: Union[str, Generator[str, None, None]]
    ) -> Generator:
        """
        Synthesize audio from either a string or a generator of text strings.

        Args:
            text_or_gen (Union[str, Generator[str, None, None]]): Input text or generator.

        Returns:
            Generator: A generator yielding audio chunks as bytes (or None when done).
        """
        if isinstance(text_or_gen, str):
            original_text = text_or_gen
            print(f"TTS Engine: Synthesizing single string: {text_or_gen}")

            def text_gen():
                yield original_text

            text_or_gen = text_gen()

        q = Queue()
        done = threading.Event()
        self._stop_event.clear()

        def feeder():
            buffer = ""
            sentence_end_re = re.compile(
                r"(.+?[.!?][\"']?\s+|.+?[.!?][\"']?$|.+?,\s+|.+?,$)"
            )
            chunk_buffer = []
            cached = None
            last_flush_time = time.time()

            for chunk in text_or_gen:
                if self._stop_event.is_set():
                    break

                buffer += chunk
                chunk_buffer.append(chunk)

                if len(buffer.split()) < self.MIN_FLUSH_LEN:
                    continue

                while True:
                    match = sentence_end_re.search(buffer)
                    if not match:
                        break

                    end = match.end()
                    phrase = buffer[:end].strip()
                    buffer = buffer[end:]

                    if cached:
                        phrase = f"{cached} {phrase}".strip()
                        cached = None

                    if len(phrase.split()) < self.MIN_FLUSH_LEN:
                        cached = phrase
                    else:
                        q.put(phrase)
                        last_flush_time = time.time()

                if (
                    buffer
                    and time.time() - last_flush_time > self.SENTENCE_DETER_TIMEOUT
                ):
                    if len(buffer.split()) >= self.MIN_FLUSH_LEN:
                        if cached:
                            buffer = f"{cached} {buffer}".strip()
                            cached = None
                        q.put(buffer)
                        buffer = ""
                        chunk_buffer.clear()
                        last_flush_time = time.time()

            if not self._stop_event.is_set():
                if cached:
                    buffer = f"{cached} {buffer}".strip()
                if buffer.strip():
                    print("Flushing unpunctuated tail:", repr(buffer))
                    q.put(buffer.strip())
            done.set()

        def tts_streamer():
            self.__set_playing(True)
            try:
                while not self._stop_event.is_set() and (
                    not done.is_set() or not q.empty()
                ):
                    try:
                        phrase = q.get(timeout=0.1)
                        if self._stop_event.is_set():
                            break
                        tts_gen = self.pipeline(
                            phrase, speed=self.speed, voice=self.voice
                        )
                        for result in tts_gen:
                            if self._stop_event.is_set():
                                break
                            yield result
                    except Empty:
                        continue
            finally:
                self.__set_playing(False)
                if self.on_audio_stream_stop:
                    self.on_audio_stream_stop()
                yield None

        self._stream_thread = threading.Thread(target=feeder, daemon=True)
        self._stream_thread.start()
        return tts_streamer()
