// Thai audio for insights (spec §16.3): pre-recorded clips first, speechSynthesis fallback.
import { clipId, renderThai, type Frag } from '../config/thai_templates';

interface Manifest { clips: Record<string, string> }
let manifestP: Promise<Manifest> | null = null;
function manifest() {
  manifestP ??= fetch('/audio/th/manifest.json')
    .then((r) => (r.ok ? r.json() : { clips: {} }))
    .catch(() => ({ clips: {} }));
  return manifestP;
}

export function thaiVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in globalThis)) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('th'));
}

/** speechSynthesis voices load asynchronously on Android Chrome. */
export function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in globalThis)) return Promise.resolve([]);
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((res) => {
    const t = setTimeout(() => res(speechSynthesis.getVoices()), 1500);
    speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); res(speechSynthesis.getVoices()); }, { once: true });
  });
}

let current: HTMLAudioElement | null = null;
function playFile(src: string): Promise<void> {
  return new Promise((res, rej) => {
    const a = new Audio(src);
    current = a;
    a.onended = () => res();
    a.onerror = () => rej(new Error('clip failed: ' + src));
    a.play().catch(rej);
  });
}

export type SpeakResult = 'clips' | 'tts' | 'no-voice';

/** Plays a template sentence. Returns which source was used. */
export async function speakThai(frags: Frag[]): Promise<SpeakResult> {
  stopSpeaking();
  const m = await manifest();
  const files = frags.map((f) => {
    const id = clipId(f);
    return id ? m.clips[id] : undefined;
  });
  if (files.every(Boolean)) {
    try {
      for (const f of files) await playFile('/audio/th/' + f);
      return 'clips';
    } catch {
      /* fall through to TTS */
    }
  }
  return speakTextThai(renderThai(frags));
}

export async function speakTextThai(text: string): Promise<SpeakResult> {
  const voices = (await voicesReady()).filter((v) => v.lang.toLowerCase().startsWith('th'));
  if (!voices.length) return 'no-voice';
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'th-TH';
  u.voice = voices.find((v) => v.localService) ?? voices[0];
  u.rate = 0.9;
  speechSynthesis.speak(u);
  return 'tts';
}

export function stopSpeaking() {
  current?.pause();
  current = null;
  if ('speechSynthesis' in globalThis) speechSynthesis.cancel();
}
