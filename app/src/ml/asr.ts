// Whisper speech recognition for guest feedback (spec §4, §6.2). Language is forced
// to the guest's chosen language. Audio is decoded in memory and never stored.
import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import type { GuestLang } from '../config/aspects';
import { configureEnv, MODELS, pickDevice, type Progress } from './env';

const WHISPER_LANG: Record<GuestLang, string> = { en: 'english', zh: 'chinese', ko: 'korean' };

export type AsrModel = typeof MODELS.asrTiny | typeof MODELS.asrBase;
export function asrModel(): AsrModel {
  return (localStorage.getItem('raofang.asrModel') as AsrModel) || MODELS.asrTiny;
}

let asr: { id: string; p: Promise<AutomaticSpeechRecognitionPipeline> } | null = null;
export function loadAsr(onProgress?: Progress, id: string = asrModel()) {
  configureEnv();
  if (!asr || asr.id !== id) {
    const p = (async () =>
      (await pipeline('automatic-speech-recognition', id, {
        dtype: 'q8',
        device: await pickDevice(),
        progress_callback: onProgress as any,
      })) as AutomaticSpeechRecognitionPipeline)();
    asr = { id, p };
    p.catch(() => (asr = null));
  }
  return asr.p;
}

/** Decode a recorded Blob (webm/opus from MediaRecorder) to 16 kHz mono Float32. */
export async function decodeTo16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const audio = await ctx.decodeAudioData(buf);
    if (audio.numberOfChannels === 1) return audio.getChannelData(0);
    const a = audio.getChannelData(0), b = audio.getChannelData(1);
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = (a[i] + b[i]) / 2;
    return out;
  } finally {
    ctx.close();
  }
}

export async function transcribe(samples: Float32Array, lang: GuestLang, id?: string): Promise<string> {
  const p = await loadAsr(undefined, id);
  const out: any = await p(samples, {
    language: WHISPER_LANG[lang],
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  return (Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text).trim();
}
