# Phase 0 benchmarks

> **Status: TODO [MANUAL] — no on-device numbers yet.** The benchmark page exists (`#/dev/benchmark`),
> but it has not been run on the Android phone. Nothing below is estimated or invented: every empty cell
> is waiting for a real measurement.

## How to run (spec §4 Phase 0, §16.1)

1. Deploy `app/` to Vercel or Netlify (see README) and open the **HTTPS URL** on the phone in Chrome. Do not test over a LAN IP.
2. ⚙️ Settings → DevBenchmark. Check that **crossOriginIsolated = true** and **WASM threads used > 1**.
3. Online: tap *Load e5*, *Load whisper-base*, *Load whisper-tiny*, and (on Wi-Fi) *Load NLLB*.
4. Install the PWA to the home screen, turn **airplane mode on**, reopen the app, open DevBenchmark again.
5. *Record 10 s* while reading the sentence shown, then *Whisper base*, *Whisper tiny*, *e5 embed*, *NLLB translate*.
   Optionally switch WebGPU on and repeat.
6. *Copy as Markdown* and paste it under **Results** below. Check the offline fetch log: every entry should be served from cache.

Decision rules (spec §4, §16.4): NLLB > 15 s or crash → try q4, else translate-on-demand, else original + Thai labels only.
Whisper base > 10 s, or core bundle > 200 MB → whisper-tiny (Settings → เสียงเป็นข้อความ). Record which rule fired.

## Results

| Field | Value |
|---|---|
| Date | TODO |
| Device model | TODO |
| Android version | TODO |
| Chrome version | TODO |
| crossOriginIsolated | TODO |
| hardwareConcurrency / WASM threads used | TODO |
| WebGPU adapter available | TODO |
| Whisper base q8 — 10 s English audio → text (airplane mode) | TODO |
| Whisper tiny q8 — 10 s English audio → text | TODO |
| e5-small q8 — embed one 30-word sentence (warm) | TODO |
| NLLB-600M q8 — 30-word en → th | TODO |
| Peak JS heap (performance.memory) | TODO |
| Crashes / tab reloads | TODO |
| Decision taken | TODO |

## Sizes

Measured on the phone as actual bytes in Cache Storage (Settings / DevBenchmark), spec §16.4:

| Bundle | Contents | Size |
|---|---|---|
| **Core** (target ≤ 200 MB) | app shell + ONNX runtime + Whisper (base or tiny) + e5-small + heads.json + Thai clips | TODO |
| **Translation pack** (optional) | NLLB-200-distilled-600M q8 | TODO |

Measured at build time in the dev container (not on the phone, no models):

| Item | Size | How measured |
|---|---|---|
| Service-worker precache (app shell incl. ONNX runtime WASM, icons, placeholders) | 27,118 KiB (25 files) | `vite build` → vite-plugin-pwa report |
| `ort-wasm-simd-threaded.asyncify.wasm` (part of the above) | 26,861,777 bytes | `ls -l app/public/ort/` |
| Main JS bundle | 841 kB (250 kB gzip) | `vite build` |

Model files measured by download in the build container (not yet in Cache Storage on the phone):

| Model file | Size |
|---|---|
| `Xenova/multilingual-e5-small` `onnx/model_quantized.onnx` (q8) | 112 MB |
| `app/public/models/heads.json` | 61 KB |

Embedding parity, Python fp32 (`intfloat/multilingual-e5-small`) vs. the app's q8 ONNX file run with ONNX Runtime (Python),
same pooling: cosine 0.99840 / 0.99762 / 0.99546 / 0.99413 / 0.99720 on the 5 parity sentences (en, zh, ko, th, en) — all > 0.99.
Still to confirm on the phone with transformers.js at `#/dev/parity`.
