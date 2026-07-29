import { WordTiming, audioCtxRef, wordQueueRef } from "@/hooks/constantsLipsync";
import {onPlaybackStarted, onPlaybackStopped} from "../hooksChat/UseTTS"

type RawItem = {
  grapheme: string;
  phoneme: string;
  start: number;
  end: number;
};

type Options = {
  keepPunctuation?: boolean; // default false
  headStartSec?: number;     // default 0.045–0.06
  suspendAfterMs?: number;
};

const IS_PUNCT = /^[\s,.;:!?-]+$/;


export function buildSentenceSequential(
  raw: RawItem[],
  keepPunctuation = false
): { sentence: string; words: WordTiming[] } {
  let sentence = "";
  const words: WordTiming[] = [];
  //console.log(raw)
  for (const r of raw) {
    const g = (r.grapheme ?? "").trim(); // keep it simple; drop pure whitespace
    if (!g) continue;

    if (IS_PUNCT.test(g)) {
      // append punctuation with no extra space before it
      sentence += g;
      if (keepPunctuation) {
        words.push({ word: "(pause)", phoneme: ",", start: r.start, end: r.end });
      }
    } else {
      // append a space before words if sentence isn't empty
      if (sentence.length > 0) sentence += " ";
      sentence += g;

      words.push({ word: g, phoneme: r.phoneme ?? "", start: r.start, end: r.end });
    }
  }

  return { sentence: sentence.trim(), words };
}
export async function playWithPhonemes(
  audioUrl: string,
  jsonUrl: string,
  opts: Options = {}
): Promise<{ stop: () => void; sentence: string }> {
  const keepPunctuation = opts.keepPunctuation ?? false;
  const headStartSec    = opts.headStartSec ?? 0.06;

  // Shared AudioContext
  type AudioContextConstructor = { new (): AudioContext };
  const AudioContextCtor: AudioContextConstructor =
    (window.AudioContext as unknown as AudioContextConstructor) ||
    ((window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext as AudioContextConstructor);
  const ctx = audioCtxRef.current ?? new AudioContextCtor();
  audioCtxRef.current = ctx;
  if (ctx.state === 'suspended') await ctx.resume();

  // Load assets
  const [raw, audioBuf] = await Promise.all([
    fetch(jsonUrl).then(r => r.json()) as Promise<RawItem[]>,
    fetch(audioUrl).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)),
  ]);

  // Parse (sequential, no sorting)
  const { sentence, words } = buildSentenceSequential(raw, keepPunctuation);
  if (!words.length) throw new Error('No usable phoneme items in JSON.');

  // Create nodes (with gain for click-free stop)
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, ctx.currentTime);

  const src = ctx.createBufferSource();
  src.buffer = audioBuf;
  src.connect(gain);
  gain.connect(ctx.destination);

  // Put 0-based words straight into the queue that prepareTimelineFromWords() reads.
  wordQueueRef.current = words.slice(); // replace any leftovers defensively

  // One source of truth: set epoch + build events via your own starter
  const t0 = onPlaybackStarted(headStartSec);

  // Start audio *exactly* at the epoch your starter set
  src.start(t0);

  // Unified cleanup: stop() or natural end → same reset
  let done = false;
  const finalize = () => {
    if (done) return;
    done = true;
    try { src.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
    onPlaybackStopped(); // ← resets t0Ref, queues, seen, seg state
  };

  const stop = () => {
    if (done) return;
    const now = ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.10);
      src.stop(now + 0.11);
    } catch {}
    finalize();
  };

  src.onended = finalize;

  return { stop, sentence };
}