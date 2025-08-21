import { useRef, useCallback } from "react";
import { WordTiming,
      t0Ref, outputLatencySec, 
      pendingEventsRef,
      activeEnvelopesRef,
      VisemeEvent,
      segStateRef,
      seenEventsRef
 } from "../../../hooks/constantsLipsync";
import { wordToVisemeEvents } from "../avatarFeature/phonemeConvert";
export function useTTS(
  audioCtxRef: React.RefObject<AudioContext | null>,
  socketRef:   React.RefObject<WebSocket | null>,
  isInitializedRef: React.RefObject<boolean>,
  isTTSPlayingRef: React.RefObject<boolean>,
  isAwaitingBotResponseRef: React.RefObject<boolean>,
  wordQueueRef: React.RefObject<WordTiming[]>,
) {
  const ttsNodeRef = useRef<AudioWorkletNode | null>(null);

  const ensureCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  // word queue for TTS
  function prepareTimelineFromWords() {
    const events: VisemeEvent[] = [];
    for (const w of wordQueueRef.current) {
      for (const ev of wordToVisemeEvents(w)) {
        const key = `${ev.name}@${ev.at.toFixed(3)}`;
        if (seenEventsRef.current.has(key)) continue;
        seenEventsRef.current.add(key);
        events.push(ev);
      }
      // This print the word according with the viseme events
      //console.log(`[TTS] Converted word "${w.word}"`, wordToVisemeEvents(w));
    }
    events.sort((a, b) => a.at - b.at);
    //console.log(`[TTS] Pending events:`, events)
    pendingEventsRef.current.push(...events);
    
    wordQueueRef.current = [];
  }

  function onPlaybackStarted() {
    const ctx = audioCtxRef.current!;
    //clearVisemeTimeline() // reset dedupe/pending/active/queue
    t0Ref.current = ctx.currentTime + outputLatencySec;
    prepareTimelineFromWords();
  }

  function onPlaybackStopped() {
    t0Ref.current = null;
    pendingEventsRef.current = [];
    activeEnvelopesRef.current = [];
    // reset segment & dedupe state
    segStateRef.current = { segOffset: 0, lastAbsEnd: 0 };
    seenEventsRef.current.clear();
  }

  // Initialize TTS playback
  const initTTSPlayback = useCallback(async () => {
    if (isInitializedRef.current) {
      console.log("[TTS] Already initialized");
      return;
    }

    try {
      const audioCtx = ensureCtx();

      const processorCode = `
        class TTSPlaybackProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.bufferQueue = [];
            this.readOffset = 0;
            this.samplesRemaining = 0;
            this.isPlaying = false;

            this.port.onmessage = (event) => {
              if (event.data?.type === "clear") {
                this.bufferQueue = [];
                this.readOffset = 0;
                this.samplesRemaining = 0;
                this.isPlaying = false;
                return;
              }
              this.bufferQueue.push(event.data);
              this.samplesRemaining += event.data.length;
            };
          }

          process(_, outputs) {
            const output = outputs[0][0];
            if (!output) return true;

            if (this.samplesRemaining === 0) {
              output.fill(0);
              if (this.isPlaying) {
                this.isPlaying = false;
                this.port.postMessage({ type: "ttsPlaybackStopped" });
              }
              return true;
            }

            if (!this.isPlaying) {
              this.isPlaying = true;
              this.port.postMessage({ type: "ttsPlaybackStarted" });
            }

            let outIdx = 0;
            while (outIdx < output.length && this.bufferQueue.length > 0) {
              const buffer = this.bufferQueue[0];
              output[outIdx++] = buffer[this.readOffset++] / 32768;
              this.samplesRemaining--;

              if (this.readOffset >= buffer.length) {
                this.bufferQueue.shift();
                this.readOffset = 0;
              }
            }

            while (outIdx < output.length) output[outIdx++] = 0;

            return true;
          }
        }

        registerProcessor("tts-playback-processor", TTSPlaybackProcessor);
      `;

      const blob = new Blob([processorCode], { type: "application/javascript" });
      const moduleURL = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(moduleURL);

      const ttsNode = new AudioWorkletNode(audioCtx, "tts-playback-processor");
      ttsNodeRef.current = ttsNode;

      ttsNode.port.onmessage = (event) => {
        const { type } = event.data;
        if (type === "ttsPlaybackStarted" && !isTTSPlayingRef.current) {
          isTTSPlayingRef.current = true;
          isAwaitingBotResponseRef.current = true; // Reset awaiting state
          // anchor lipsync to the actual audio clock start
          onPlaybackStarted(); // Start playback
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: "tts_start" }));
          }
          console.log("[TTS] Playback started");
          
        }
        if (type === "ttsPlaybackStopped" && isTTSPlayingRef.current) {
          
          isAwaitingBotResponseRef.current = false; // Reset awaiting state
          // clear lipsync state on stop
          onPlaybackStopped();
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: "tts_stop" }));
          }
          console.log("[TTS] Playback stopped");
          isTTSPlayingRef.current = false;
        }
      };

      ttsNode.connect(audioCtx.destination);
      isInitializedRef.current = true;
      console.log("[TTS] Initialization complete");
    } catch (err) {
      console.log("[TTS] Failed to initialize TTS playback", err);
    }
  }, []);

  const playTTSChunk = (pcm: Int16Array) => {
    if (ttsNodeRef.current) {
      ttsNodeRef.current.port.postMessage(pcm);
      console.log("[TTSPlayback] Playing TTS chunk");
    } else {
      console.log("[TTSPlayback] TTS node not initialized");
      return;
    }
  }
    
  const stopTTSPlayback = async () => {
    if (!ttsNodeRef.current) return;
    ttsNodeRef.current.port.postMessage({ type: "clear" });
    onPlaybackStopped();
  }

  const cleanupTTS = useCallback( async () => {
    // Ensure the processor is told to stop
    stopTTSPlayback();
    // Detach listeners and disconnect
    if (ttsNodeRef.current) {
      ttsNodeRef.current.port.onmessage = null;
      ttsNodeRef.current.disconnect();
      ttsNodeRef.current = null;
    }
  }, [stopTTSPlayback]);

  return { initTTSPlayback, playTTSChunk, stopTTSPlayback, cleanupTTS };
}
