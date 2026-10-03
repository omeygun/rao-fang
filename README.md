# เราฟัง Rao Fang — offline visitor feedback for a farm-tour host

Offline PWA (React + Vite + TypeScript) for Noor, a coffee farmer in northern Thailand who hosts foreign visitors.
Guests leave feedback in English, Chinese or Korean on the phone; an on-device classifier sorts it into tour aspects;
Noor reviews Thai insights built from counts, fixed templates and real quotes, with Thai audio. Kham Mueang
(Northern Thai) enters through Teach Mode and a personal dictionary that normalises Noor's notes to Central Thai.
Spec: [`spec.md`](spec.md).

## Status — what is done and what is not

| Part | Status |
|---|---|
| PWA: Guest Mode, Insights, not-sure queue + manual tags, Teach Mode (word / sentence swap / helper), notes with Kham Mueang normalisation, Settings, PIN, export, delete | ✅ built, typechecks, unit tests pass, flows smoke-tested in headless Chromium (without models) |
| COOP/COEP headers (`vercel.json`, `public/_headers`), same-origin ONNX runtime, service-worker precache | ✅ `crossOriginIsolated === true` under `vite preview` |
| DevBenchmark / DevParity pages | ✅ built — **not run on a phone yet** |
| ML pipeline (`ml/`): teacher, student, export, eval, km_eval, FLORES | ✅ code done; smoke-tested end-to-end with a fake embedder on throwaway fixtures |
| `synthetic.jsonl`, trained `heads.json` | ❌ not generated — needs `ANTHROPIC_API_KEY` and Hugging Face access |
| Phase 0 numbers, model sizes | ❌ TODO on the phone (`docs/benchmarks.md`) |
| Human test set, Kham Mueang pairs, Thai audio clips, tour photos, evidence citations | ❌ **[MANUAL]** — templates and scripts provided |

Without `heads.json`, the app still runs: every text feedback goes to the “ไม่แน่ใจ” queue for manual tagging,
and photo ratings are counted normally.

## Run the app

```bash
cd app
npm install            # postinstall copies the ONNX runtime WASM into public/ort/
npm run dev            # http://localhost:5173 (COOP/COEP set)
npm test               # vitest: normaliser, uncertainty rules, insights engine, templates
npm run build && npm run preview
```

Routes: `#/` home · `#/guest` · `#/insights` · `#/teach` · `#/settings` · `#/dev/benchmark` · `#/dev/parity`.

## Deploy (HTTPS from day one, spec §16.1)

- **Vercel:** import the repo, root directory `app`, framework Vite. Headers come from `app/vercel.json`.
- **Netlify:** base directory `app`, build `npm run build`, publish `dist`. Headers from `app/public/_headers`.

Test the phone **only over that HTTPS URL**. Verify on DevBenchmark that `crossOriginIsolated` is true.
Model files are fetched from huggingface.co with CORS; under `Cross-Origin-Embedder-Policy: require-corp` CORS
fetches are allowed — **verify on the phone**; if anything is blocked, switch the header to `credentialless` in both files.

## Offline install on the phone

1. Open the HTTPS URL in Chrome on the Android phone → menu → *Install app* / *Add to Home screen*.
2. Open from the home screen → ⚙️ → *ดาวน์โหลด / ตรวจสอบโมเดลหลัก* (Whisper + e5, on Wi-Fi). Optional: *ดาวน์โหลดชุดแปลภาษา* (NLLB, large).
3. Check the home chip shows ✅ and Settings shows persistent storage granted (installing to home screen helps).
4. Airplane mode on → everything (guest → insights → not-sure → teach → notes) keeps working.

## Model sizes

| Bundle | Contents | Measured size |
|---|---|---|
| Core (target ≤ 200 MB) | app shell + ONNX runtime + Whisper q8 + e5-small q8 + heads.json + Thai clips | **TODO — measure on phone** |
| Translation pack (optional) | NLLB-200-distilled-600M q8 | **TODO — measure on phone** |
| App shell precache (measured at build) | JS/CSS/HTML + ONNX runtime WASM (26.9 MB) + icons | 27,118 KiB |

Sizes are read from Cache Storage in Settings and DevBenchmark. See `docs/benchmarks.md`.

## Reproduce the ML pipeline (CPU only)

```bash
cd ml
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...
python gen_synthetic.py --model <claude-model-id> --workers 4   # → data/synthetic.jsonl (cached, resumable)
python train_student.py                                         # → data/student.json, dev report, app/public/models/parity.json
python export_heads.py                                          # → app/public/models/heads.json
# [MANUAL] write data/human_test.jsonl (see data/README.md), then:
python eval.py                                                  # → docs/eval.md
# [MANUAL] export Teach Mode data from the app, then:
python km_eval.py --from-export raofang-export-YYYY-MM-DD.json  # → docs/km_eval.md
python flores_eval.py                                           # optional → docs/flores_eval.md
```

Then open `#/dev/parity` on the phone: cosine between Python and browser embeddings must be > 0.99.

## Thai audio clips (spec §16.3)

`python scripts/gen_audio_script.py` writes `scripts/audio_script.md` (55 clips). A Thai speaker records them into
`app/public/audio/th/`, then `python scripts/gen_audio_script.py --scan` writes the manifest. Missing clips → the whole
sentence is spoken with `speechSynthesis`; no Thai voice → the app shows how to install one.

## Docs

`docs/benchmarks.md` · `docs/eval.md` · `docs/km_eval.md` · `docs/datasets.md` · `docs/responsible_ai.md` · `docs/video_script.md`
