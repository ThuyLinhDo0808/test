import { useRef } from "react";
import { pendingEventsRef, 
        t0Ref, 
        wordQueueRef,
        seenEventsRef,
        segStateRef,
        WordTiming, VisemeEvent,
        activeEnvelopesRef
       } from "../../../hooks/constantsLipsync";
// Consonants
const C_MAP: Record<string, string> = {
  p:"viseme_PP", b:"viseme_PP", m:"viseme_PP",

  f:"viseme_FF", v:"viseme_FF",

  t:"viseme_DD", d:"viseme_DD", ɾ:"viseme_DD", ʔ:"viseme_DD",

  s:"viseme_SS", z:"viseme_SS", ʃ:"viseme_SS", ʒ:"viseme_SS",

  "tʃ":"viseme_CH", "dʒ":"viseme_CH",

  k:"viseme_kk", g:"viseme_kk",

  n:"viseme_nn", ŋ:"viseme_nn",

  l:"viseme_RR", r:"viseme_RR", ɹ:"viseme_RR",

  θ:"viseme_TH", ð:"viseme_TH",

  // Approximations
  w:"viseme_U",   // rounded lips
  j:"viseme_I",   // close front
  h:"viseme_E"    // neutral/mid
};

// Vowels
const V_MAP: Record<string, string> = {
  a:"viseme_aa", æ:"viseme_aa", ɑ:"viseme_aa", ɐ:"viseme_aa", ɒ:"viseme_aa",

  e:"viseme_E", ɛ:"viseme_E",

  i:"viseme_I", ɪ:"viseme_I",

  o:"viseme_O", ɔ:"viseme_O",

  u:"viseme_U", ʊ:"viseme_U",

  // central/rhotics → neutral
  ə:"viseme_E", ʌ:"viseme_E", ɚ:"viseme_E", ɝ:"viseme_E"
};

// Diphthongs → two vowels
const DIPHTHONGS = new Set([
  "aɪ","eɪ","oʊ","aʊ","ɔɪ",      // common EN diphthongs
  "ɪə","eə","ʊə",               // (often BrE; harmless if seen)
  "tʃ","dʒ"                      // affricates
]);

// Kokoro-specific fixes: some phonemes are uppercase
const KOKORO_UPPER_FIXES: Record<string, string> = {
  O: "o", W: "w", A: "a", E: "e", I: "i", U: "u", Y: "y",
};

// Normalizes a phoneme string to a consistent format
export function normalizePhonemeString(s: string): string {
  if (!s) return "";

  // 1) NFC so combining marks are consistent
  let out = s.normalize("NFC");

  // 2) Known Kokoro quirks & ASCII variants
  out = out
    .replace(/ɡ/g, "g")   // IPA "ɡ" → "g"
    .replace(/ʧ/g, "tʃ")  // ASCII-ish affricates
    .replace(/ʤ/g, "dʒ");

  // 3) R-colored vowels → explicit vowel + rhotic (simplifies downstream)
  //    (we'll still allow your direct V_MAP matches for ɚ/ɝ too)
  out = out.replace(/ɚ/g, "əɹ").replace(/ɝ/g, "ɜɹ");

  // 4) Drop prosody/segmentation marks that don’t affect mouth shape
  out = out
    .replace(/[ˈˌ.]/g, "") // primary/secondary stress + syllable dots
    .replace(/[ː]/g, "");  // length mark — let timing handle duration

  // 5) Remove IPA tie bars (t͡ʃ → tʃ) and other odd joiners
  out = out.replace(/[\u0361\u035C]/g, ""); // combining tie bars

  // 6) Strip generic combining diacritics (nasalization, syllabic, tone, etc.)
  //    Mouth shapes won’t change from these in your rig.
  out = out.replace(/\p{M}+/gu, "");

  // 7) Uppercase letters some TTS emit → lowercase
  out = out.replace(/[A-Z]/g, (m) => KOKORO_UPPER_FIXES[m] ?? m.toLowerCase());

  // 8) Remove spaces
  out = out.replace(/\s+/g, "").trim();

  return out;
}
// Quick helpers
const VOWELS = new Set(["a","æ","ɑ","ɐ","ɒ","e","ɛ","i","ɪ","o","ɔ","u","ʊ","ə","ʌ","ɜ","ɚ","ɝ"]);
const RHOTICS = new Set(["r","ɹ"]);

// Tokenizes a phoneme string into IPA tokens
export function tokenizeIPA(s: string): string[] {
  const str = normalizePhonemeString(s);
  if (!str) return [];

  const out: string[] = [];
  for (let i = 0; i < str.length; ) {
    const ch = str[i];
    const next = str[i + 1];
    const two = next ? ch + next : "";

    // 1) diphthong / affricate 2-char sequences
    if (DIPHTHONGS.has(two)) { out.push(two); i += 2; continue; }

    // 2) vowel + rhotic collapse (e.g., "oɹ" → "oɹ")
    if (VOWELS.has(ch) && RHOTICS.has(next)) {
      out.push(ch + next); // synthetic token we’ll resolve to [vowel, RR]
      i += 2; continue;
    }

    // 3) skip punctuation/safety (should be gone, but cheap)
    if (/[\s,;:!?-]/.test(ch)) { i += 1; continue; }

    // 4) single char token
    out.push(ch);
    i += 1;
  }
  return out;
}

export function resolveTokenToVisemes(token: string): string[] {
  // Diphthongs & affricates
  if (DIPHTHONGS.has(token)) {
    // map each half via your tables for consistency
    if (token === "tʃ") return ["viseme_CH"];
    if (token === "dʒ") return ["viseme_CH"];
    // vowel diphthongs split to two vowel visemes
    const a = V_MAP[token[0]]; const b = V_MAP[token[1]];
    if (a && b) return [a, b];
  }

  // Vowel + rhotic synthetic token: "oɹ", "eɹ", "ɑr", etc.
  if (token.length === 2 && VOWELS.has(token[0]) && RHOTICS.has(token[1])) {
    const v = V_MAP[token[0]];
    if (v) return [v, "viseme_RR"];
  }

  // Plain consonant / vowel
  if (C_MAP[token]) return [C_MAP[token]];
  if (V_MAP[token]) return [V_MAP[token]];

  // Fallbacks / unknown symbol → neutral
  return ["viseme_E"];
}

// timing constants (tweak to taste)
const MIN_SLOT = 0.10;   // ≥100ms per token so shapes are visible
const WORD_EVENT_CAP = 4;        // hard cap per word (very fast words)
const KEEP_AT_LEAST = 2;         // never drop below 2 tokens
const MIN_DUR  = 0.08;   // ≥80ms per envelope
const MAX_DUR  = 0.18;   // cap overlong holds
const ATTACK   = 0.03;   // 30ms fade-in
const DECAY    = 0.04;   // 40ms fade-out
const SPLIT_OVERLAP = 0.9; // second viseme starts near end of first half

// Simple sets (adjust to taste)
const DROPPABLE = new Set(["h","ɾ","ʔ"]);                // weak/visual-lite
const LABIALS   = new Set(["p","b","m"]);                // strong closures
const AFFRIC    = new Set(["tʃ","dʒ"]);
const SIBILANTS = new Set(["s","z","ʃ","ʒ","f","v","θ","ð"]);
const LIQUIDS   = new Set(["l","r","ɹ"]);
const NASALS    = new Set(["n","ŋ"]);

function isVowelToken(t: string) {
  // Works with your maps: treat vowel or vowel+rhotic as vowel-ish
  return !!V_MAP[t] || (!!V_MAP[t[0]] && (t.length === 1 || t[1] === "ɹ" || t[1] === "r"));
}

function tokenPriority(t: string): number {
  if (AFFRIC.has(t))            return 3.0;   // very visible
  if (isVowelToken(t))          return 3.0;   // keep vowels
  if (LABIALS.has(t))           return 2.5;   // clear closures
  if (SIBILANTS.has(t))         return 1.8;
  if (NASALS.has(t))            return 1.6;
  if (LIQUIDS.has(t))           return 1.4;
  // other stops etc.
  if (C_MAP[t])                 return 1.7;
  return 1.0;
}

/** Reduce token count to keep ≥MIN_SLOT and ≤WORD_EVENT_CAP while preserving the most visible phones. */
function compressTokens(tokens: string[], span: number): string[] {
  if (!tokens.length) return tokens;

  const currentSlot = span / tokens.length;
  // If already slow and under cap, keep as-is.
  if (currentSlot >= MIN_SLOT && tokens.length <= WORD_EVENT_CAP) return tokens.slice();

  let out = tokens.slice();

  // 1) Drop weak phones first (if we have room to drop)
  if (out.length > KEEP_AT_LEAST) {
    out = out.filter(t => !(DROPPABLE.has(t) && out.length > KEEP_AT_LEAST));
  }

  // 2) Determine target count based on time + hard cap
  const targetByTime = Math.max(KEEP_AT_LEAST, Math.ceil(span / MIN_SLOT));
  const target = Math.min(WORD_EVENT_CAP, targetByTime);

  // 3) If still too many, remove lowest-priority (protect vowels first)
  while (out.length > target) {
    let dropIdx = -1;
    let best = Infinity;
    for (let i = 0; i < out.length; i++) {
      const t = out[i];
      const score = tokenPriority(t) + (isVowelToken(t) ? 100 : 0); // make vowels expensive to drop
      if (score < best) { best = score; dropIdx = i; }
    }
    if (dropIdx < 0) break;
    out.splice(dropIdx, 1);
  }
  return out;
}

export function wordToVisemeEvents(w: WordTiming): VisemeEvent[] {
  const tokensRaw = tokenizeIPA(w.phoneme);
  const span = Math.max(0, (w.end ?? 0) - (w.start ?? 0));
  if (!tokensRaw.length || span <= 0 || !Number.isFinite(span)) return [];

  // ↓ Add compression here
  const tokens = compressTokens(tokensRaw, span);

  const slot = Math.max(MIN_SLOT, span / tokens.length);
  const evs: VisemeEvent[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const base = w.start + i * slot;
    const end  = Math.min(w.end, base + slot);
    let names = resolveTokenToVisemes(t);

    if (!names || names.length === 0) names = ["viseme_E"];

    if (names.length === 1) {
      const dur = Math.max(MIN_DUR, Math.min(MAX_DUR, end - base));
      if (dur > 0) evs.push({ at: base, name: names[0], duration: dur, peak: 1, attack: ATTACK, decay: DECAY });
    } else {
      const half = (end - base) / 2;
      const durHalf = Math.max(MIN_DUR * 0.75, Math.min(MAX_DUR * 0.75, half));
      if (durHalf > 0) {
        evs.push({ at: base, name: names[0], duration: durHalf, peak: 1, attack: ATTACK, decay: DECAY });
        evs.push({
          at: base + half * SPLIT_OVERLAP,
          name: names[1],
          duration: durHalf,
          peak: 1,
          attack: ATTACK,
          decay: DECAY
        });
      }
    }
  }

  // clamp “at” inside word span (numeric safety)
  for (const e of evs) {
    if (!Number.isFinite(e.at)) e.at = w.start;
    if (e.at < w.start) e.at = w.start;
    if (e.at > w.end)   e.at = w.end;
  }
  return evs;
}


// Normalizing each incoming batch to a single
const EPS = 0.005;       // 5ms float noise
const GAP_PAD = 0.03;    // 30ms between stitched segments
const HARD_RESET_BACKSTEP = 0.8; // >800ms rewind ⇒ new segment

function normalizeWordsToAbsolute(words: WordTiming[]): WordTiming[] {
  if (!words?.length) return [];

  const seg = segStateRef.current;

  // sanitize and ensure finite numbers
  const clean = words
    .filter(w => Number.isFinite(w.start) && Number.isFinite(w.end))
    .map(w => ({ ...w, start: +w.start, end: +w.end }))
    .filter(w => w.end >= w.start);

  if (!clean.length) return [];

  const localMin = Math.min(...clean.map(w => w.start));
  const localMax = Math.max(...clean.map(w => w.end));

  let candAbsMin = seg.segOffset + localMin;

  if (candAbsMin + EPS < seg.lastAbsEnd) {
    const backstep = seg.lastAbsEnd - candAbsMin;
    // big jump back ⇒ treat as new partial stream
    if (backstep > HARD_RESET_BACKSTEP) {
      seg.segOffset = seg.lastAbsEnd + GAP_PAD;
    } else {
      seg.segOffset += backstep + GAP_PAD;
    }
    candAbsMin = seg.segOffset + localMin;
  }

  const adjusted = clean.map(w => ({
    ...w,
    start: w.start + seg.segOffset,
    end:   w.end   + seg.segOffset,
  }));

  seg.lastAbsEnd = Math.max(seg.lastAbsEnd, seg.segOffset + localMax);
  return adjusted;
}

const BUCKET = 0.01; // 10ms bucket for keys

function bucketTimeSec(t: number) {
  return Math.round(t / BUCKET) * BUCKET;
}
function makeEventKey(ev: VisemeEvent) {
  return `${ev.name}@${bucketTimeSec(ev.at).toFixed(2)}`;
}

const MAX_VIS_CHANGES_PER_SEC = 10;    // tune: 8–12 looks natural
const MIN_EVENT_GAP = 1 / MAX_VIS_CHANGES_PER_SEC;
const MERGE_SAME_GAP = 0.05;           // merge same-viseme hits within 50ms

function decimateTimeline(events: VisemeEvent[]): VisemeEvent[] {
  if (events.length <= 1) return events.slice();

  // 1) merge adjacent same-name within MERGE_SAME_GAP (extend duration)
  const merged: VisemeEvent[] = [];
  for (const e of events) {
    const last = merged[merged.length - 1];
    if (last && last.name === e.name && e.at - (last.at + last.duration) <= MERGE_SAME_GAP) {
      const newEnd = Math.max(last.at + last.duration, e.at + e.duration);
      last.duration = newEnd - last.at;
      last.peak = Math.max(last.peak ?? 1, e.peak ?? 1);
    } else {
      merged.push({ ...e });
    }
  }

  // 2) rate-limit: ensure min gap; prefer keeping vowels/affricates
  const keep: VisemeEvent[] = [];
  let lastAt = -Infinity;
  const prefer = (e: VisemeEvent) => {
    const t = e.name;
    return (!!V_MAP[t as any] ? 2 : 0) + (t === "viseme_CH" ? 1.5 : 0) + (t === "viseme_PP" ? 1 : 0);
  };

  for (const e of merged) {
    if (e.at - lastAt >= MIN_EVENT_GAP || keep.length === 0) {
      keep.push(e);
      lastAt = e.at;
    } else {
      // conflict: replace last if current is "more visible"
      const prev = keep[keep.length - 1];
      if (prefer(e) > prefer(prev)) {
        // shift the previous event's end so the replacement doesn't overlap awkwardly
        prev.duration = Math.max(0, e.at - prev.at);
        keep[keep.length - 1] = e;
        lastAt = e.at;
      } // else: drop current
    }
  }

  return keep;
}

function pushWordsToTimeline(wordsAbs: WordTiming[]) {
  //console.log("Pushing words to timeline:", wordsAbs);
  if (!wordsAbs?.length) return;
  // sort words to avoid intra-batch inversions
  wordsAbs.sort((a, b) => a.start - b.start);

  for (const w of wordsAbs) {
    // ignore punctuation-only or empty words
    if (!w.word || /^[\s,.;:!?-]+$/.test(w.word)) continue;

    const evs = wordToVisemeEvents(w);
    for (const ev of evs) {
      const key = makeEventKey(ev);
      if (seenEventsRef.current.has(key)) continue;
      seenEventsRef.current.add(key);
      pendingEventsRef.current.push(ev);
    }
  }
  
  // keep it ordered; stable sort protects identical timestamps
  pendingEventsRef.current.sort((a, b) => a.at - b.at);
  pendingEventsRef.current = decimateTimeline(pendingEventsRef.current);
}


export function onWordTiming(content: WordTiming | WordTiming[]) {
  const arr = Array.isArray(content) ? content : [content];
  // 1) Normalize to absolute time (handles partial resets)
  const adjusted = normalizeWordsToAbsolute(arr);

  // 2a) If already playing, append immediately
  if (t0Ref.current != null) {
    pushWordsToTimeline(adjusted);
    //console.log("Pushed words to timeline:", adjusted);
    return;
  } 

  // 2b) Not playing yet -> keep words until playback starts
  wordQueueRef.current.push(...adjusted);
}