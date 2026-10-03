import { MODEL_CACHE } from './env';

/** True if any ONNX weight file of this model repo is in the transformers.js cache. */
export async function modelCached(id: string): Promise<boolean> {
  if (!('caches' in globalThis)) return false;
  const c = await caches.open(MODEL_CACHE);
  return (await c.keys()).some((r) => r.url.includes(id + '/') && r.url.includes('.onnx'));
}
