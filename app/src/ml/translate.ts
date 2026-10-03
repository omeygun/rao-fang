// NLLB-200 → Thai, shipped as an optional "translation pack" (spec §16.4).
// Never downloaded unless Noor taps download in Settings. Display only: classification
// runs on the original text, so insights work without this pack.
import { pipeline, type TranslationPipeline } from '@huggingface/transformers';
import type { GuestLang } from '../config/aspects';
import { getSetting, setSetting } from '../db/db';
import { configureEnv, MODELS, MODEL_CACHE, pickDevice, type Progress } from './env';

export const NLLB_CODE: Record<GuestLang, string> = { en: 'eng_Latn', zh: 'zho_Hans', ko: 'kor_Hang' };
export const NLLB_TARGET = 'tha_Thai';

let tr: Promise<TranslationPipeline> | null = null;

export async function packInstalled(): Promise<boolean> {
  return getSetting('translationPack', false);
}

function load(onProgress?: Progress) {
  configureEnv();
  tr ??= (async () =>
    (await pipeline('translation', MODELS.translate, {
      dtype: 'q8',
      device: await pickDevice(),
      progress_callback: onProgress as any,
    })) as TranslationPipeline)();
  tr.catch(() => (tr = null));
  return tr;
}

/** Download (and warm up) the pack. Only called from an explicit button. */
export async function installPack(onProgress?: Progress) {
  await load(onProgress);
  await setSetting('translationPack', true);
  navigator.storage?.persist?.();
}

export async function deletePack() {
  tr = null;
  await setSetting('translationPack', false);
  const cache = await caches.open(MODEL_CACHE);
  for (const req of await cache.keys()) if (req.url.includes('nllb')) await cache.delete(req);
}

export async function translateToThai(text: string, lang: GuestLang): Promise<string | null> {
  if (!(await packInstalled())) return null;
  const t = await load();
  const out: any = await t(text, { src_lang: NLLB_CODE[lang], tgt_lang: NLLB_TARGET } as any);
  return (Array.isArray(out) ? out[0] : out).translation_text?.trim() ?? null;
}
