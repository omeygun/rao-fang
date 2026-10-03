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
Whisper base > 10 s, or core bundle > 200 MB → whisper-tiny. In emulation both rules fired, so tiny is now the default; confirm on the phone.

## Emulated run (NOT the phone) — 2026-10-03

Headless Chromium 141 emulating a Pixel 7 (viewport, touch, Android UA) on a 4-core x86 container, served by
`vite preview` with COOP/COEP. Model files came from a local mirror of huggingface.co (identical files, fetched with
`huggingface_hub`) because the sandbox proxy breaks in-browser downloads. CPU throttling via DevTools approximates a
slower device; it does **not** reproduce ARM performance, thermal throttling or Android memory limits. Audio: the 11.0 s
public JFK sample (`Xenova/transformers.js-docs/jfk.wav`). All timings measured with airplane mode on (browser offline),
models loaded from Cache Storage.

| Field | 1× CPU | 4× throttled |
|---|---|---|
| crossOriginIsolated / WASM threads | true / 4 | true / 4 |
| WebGPU adapter | false (WASM used) | false |
| e5-small q8 load from cache | 1.70 s | 5.83 s |
| e5-small embed 30 words (warm) | 0.21 s | 0.31 s |
| whisper-base q8, 11.0 s English audio | 4.78 s | **15.21 s** |
| whisper-tiny q8, 11.0 s English audio | 1.78 s | **7.70 s** |
| Transcript (both models) | “And so my fellow Americans ask not what your country can do for you, ask what you can do for your country.” | same |
| NLLB | not run (translation pack, 600 MB+) | — |

**Decisions taken (spec §4, §16.4):** whisper-base exceeds 10 s at 4× throttle and pushes the core bundle over 200 MB, so
**whisper-tiny is now the default** (base stays selectable in Settings). transformers.js also kept its own 25.7 MB copy of
the ONNX runtime WASM next to the service-worker copy; `env.useWasmCache = false` removes the duplicate.

Core bundle measured in Cache Storage after the fix (Settings → โมเดลหลัก): **197.3 MB** =
e5-small 129.1 MB + whisper-tiny 41.6 MB + ONNX runtime 25.7 MB + app shell 0.9 MB (Thai clips not recorded yet).
Before the fix with whisper-base: 257.4 MB.

End-to-end in airplane mode (4× throttle): guest with **voice** (fake mic playing the JFK clip → whisper-tiny transcript in
the text box, 17.9 s for the whole guest flow), Korean and Chinese text guests, and “hmm ok” → Insights rendered offline,
no page errors. Offline fetch log: only `/models/heads.json` and `/ort/…wasm`, both served from cache. Observed classifier
outputs: zh “山路太陡了…” → walk_trail negative (p 0.85) ✓; “hmm ok” and the off-topic JFK quote → not-sure queue ✓;
ko “커피 시음이… 원두를 두 봉지 사고 싶어요” → tasting positive ✓ but **purchase_interest missed** and the item was not
flagged unsure (known gap; to be measured on the human test set, not tuned on this one example).

## Results (Android phone — TODO)

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
