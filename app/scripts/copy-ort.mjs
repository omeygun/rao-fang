// Copies the onnxruntime-web WASM runtime that transformers.js uses into public/ort/
// so it is served same-origin (COEP-safe) and precached by the service worker.
// Without this, transformers.js fetches it from cdn.jsdelivr.net at runtime and breaks offline.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../node_modules/onnxruntime-web/dist/', import.meta.url).pathname;
const out = new URL('../public/ort/', import.meta.url).pathname;
const files = ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm'];
if (!existsSync(join(dist, files[0]))) {
  console.warn('[copy-ort] onnxruntime-web not installed yet; skipping');
  process.exit(0);
}
mkdirSync(out, { recursive: true });
for (const f of files) cpSync(join(dist, f), join(out, f));
console.log(`[copy-ort] copied ${files.join(', ')} to public/ort/`);
