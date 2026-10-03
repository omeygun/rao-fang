// Measures actual bytes in Cache Storage (spec §16.4): core bundle vs. translation pack.
import { MODEL_CACHE } from './env';

export interface CacheGroup { name: string; bytes: number; files: number }

async function sizeOf(res: Response): Promise<number> {
  const len = res.headers.get('content-length');
  if (len && !res.headers.get('content-encoding')) return Number(len);
  return (await res.clone().blob()).size;
}

/** Groups cached files: each model repo (by "Org/name" in the URL), plus the app shell (Workbox precache). */
export async function measureCaches(): Promise<CacheGroup[]> {
  const groups = new Map<string, CacheGroup>();
  const add = (name: string, bytes: number) => {
    const g = groups.get(name) ?? { name, bytes: 0, files: 0 };
    g.bytes += bytes;
    g.files++;
    groups.set(name, g);
  };
  for (const cacheName of await caches.keys()) {
    const cache = await caches.open(cacheName);
    for (const req of await cache.keys()) {
      const res = await cache.match(req);
      if (!res) continue;
      const bytes = await sizeOf(res);
      if (cacheName === MODEL_CACHE) {
        const m = req.url.match(/huggingface\.co\/([^/]+\/[^/]+)\//) ?? req.url.match(/\/models\/([^/]+\/[^/]+)\//);
        add(m ? m[1] : 'model-other', bytes);
      } else if (/\/audio\/th\//.test(req.url)) add('thai-audio-clips', bytes);
      else if (/\/ort\//.test(req.url)) add('onnx-runtime-wasm', bytes);
      else add('app-shell', bytes);
    }
  }
  return [...groups.values()].sort((a, b) => b.bytes - a.bytes);
}

export const isPackGroup = (name: string) => /nllb/i.test(name);

export function coreAndPack(groups: CacheGroup[]) {
  const pack = groups.filter((g) => isPackGroup(g.name)).reduce((s, g) => s + g.bytes, 0);
  const core = groups.filter((g) => !isPackGroup(g.name)).reduce((s, g) => s + g.bytes, 0);
  return { core, pack };
}

export const mb = (b: number) => (b / 1024 / 1024).toFixed(1) + ' MB';
