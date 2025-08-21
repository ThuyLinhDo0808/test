# Pipelines Module

The `pipelines` module is responsible for managing the core functionalities of speech-to-text (STT) and text-to-speech (TTS) processes. It integrates with external services and engines to handle audio processing, transcription, and synthesis.

## **Overview**

This module contains the following key components:

1. **STT Pipeline**: Handles real-time speech-to-text transcription.
2. **TTS Pipeline**: Manages text-to-speech synthesis and integrates with language models.
3. **TTS Engine**: Provides a wrapper around the KokoroEngine for audio generation.
4. **TTS Service**: Manages audio synthesis and buffering for playback.
5. **STT Service**: Handles transcription logic using a third-party library (`RealtimeSTT`).

---

## **Key Classes**

### **1. SttPipeline**

- **Purpose**: Processes audio chunks and converts them into text using the `SttService`.
- **Responsibilities**:
  - Audio resampling and processing.
  - Running transcription loops.
  - Exposing callbacks for real-time transcription updates.
- **Dependencies**: `SttService`.

---

### **2. SttService**

- **Purpose**: Manages transcription logic using the `RealtimeSTT` library.
- **Responsibilities**:
  - Handles real-time and final transcription.
  - Detects silence and sentence boundaries.
  - Provides transcription callbacks.
- **Dependencies**: `RealtimeSTT`.

---

### **3. TtsPipeline**

- **Purpose**: Orchestrates the text-to-speech generation process.
- **Responsibilities**:
  - Manages LLM inference for generating text responses.
  - Converts text into audio using the `TtsService`.
  - Handles abort operations for ongoing synthesis.
- **Dependencies**: `TtsService`, `ConversationManager`.

---

### **4. TtsService**

- **Purpose**: Manages the text-to-speech synthesis process.
- **Responsibilities**:
  - Converts text into audio using the `KokoroEngine`.
  - Buffers audio chunks for smooth playback.
  - Provides callbacks for word timing and audio chunk readiness.
- **Dependencies**: `KokoroEngine`.

---

### **5. KokoroEngine**

- **Purpose**: A wrapper around the `KPipeline` library for text-to-speech synthesis.
- **Responsibilities**:
  - Splits text into manageable chunks.
  - Generates audio from text.
  - Streams audio chunks to the `TtsService`.

---

## **Interactions**

- **ChatSession**: The pipelines interact with the `ChatSession` to provide transcription results and synthesized audio for playback.
- **Workflow Service**: The `TtsPipeline` integrates with the `ConversationManager` to generate text responses using a language model.
- **Frontend**: Audio and transcription results are sent to the frontend via the `ChatSession`.

---

## **Usage**

1. **STT Pipeline**:

   - Initialize the `SttPipeline` with an instance of `SttService`.
   - Start the transcription loop to process audio chunks.

2. **TTS Pipeline**:

   - Use the `TtsPipeline` to generate text responses and convert them into audio.
   - Handle abort operations for ongoing synthesis when new input is received.

3. **TTS Engine**:
   - Configure the `KokoroEngine` for specific voices and speeds.
   - Use the `synthesize` method to generate audio from text.

---

## **Future Enhancements**

- Add support for additional TTS and STT engines.
- Improve error handling and logging for transcription and synthesis processes.
- Optimize audio buffering for low-latency playback.
