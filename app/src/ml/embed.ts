// multilingual-e5-small sentence embeddings (spec §4). Must match ml/train_student.py:
// "query: " prefix, mean pooling over tokens, L2 normalisation.
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { configureEnv, MODELS, pickDevice, type Progress } from './env';

export const E5_PREFIX = 'query: ';
let extractor: Promise<FeatureExtractionPipeline> | null = null;

export function loadEmbedder(onProgress?: Progress) {
  configureEnv();
  extractor ??= (async () =>
    (await pipeline('feature-extraction', MODELS.embed, {
      dtype: 'q8',
      device: await pickDevice(),
      progress_callback: onProgress as any,
    })) as FeatureExtractionPipeline)();
  extractor.catch(() => (extractor = null));
  return extractor;
}

/** Embed raw strings that already carry the "query: " prefix. Returns one Float32Array (384-d) per input. */
export async function embedPrefixed(texts: string[]): Promise<Float32Array[]> {
  const fe = await loadEmbedder();
  const out = await fe(texts, { pooling: 'mean', normalize: true });
  const dim = out.dims[out.dims.length - 1];
  const data = out.data as Float32Array;
  return texts.map((_, i) => data.slice(i * dim, (i + 1) * dim));
}

export const e5Input = (text: string) => E5_PREFIX + text.trim();
/** Input format for the aspect-conditioned sentiment head (spec §5). */
export const e5AspectInput = (text: string, aspect: string) => `${E5_PREFIX}${text.trim()} [aspect: ${aspect}]`;
