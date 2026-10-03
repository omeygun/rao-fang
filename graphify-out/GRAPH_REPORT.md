# Graph Report - Noor  (2026-10-03)

## Corpus Check
- Corpus is ~42,094 words - fits in a single context window. You may not need a graph.

## Summary
- 538 nodes · 1300 edges · 27 communities (23 shown, 4 thin omitted)
- Extraction: 92% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 97 edges (avg confidence: 0.91)
- Token cost: 230,838 input · 0 output

## Community Hubs (Navigation)
- App UI Screens & Components
- On-device ML & Data Ops
- App Shell, PIN & Notes
- npm Dependencies
- Python Embedder
- Datasets & Teacher Model
- Student Evaluation (eval.py)
- Responsible AI & Privacy
- Entry Page & ML Requirements
- Phase 0 Device Benchmarks
- Student Model
- Synthetic Data Generation
- TypeScript Config
- Head Export & FLORES Eval
- Human Test Set & Distillation
- Kham Mueang Eval
- Thai Audio Clips
- Uncertainty & Fail-safes
- Coffee Tour Stages
- Thai Speech Playback
- Deploy & Offline Demo
- Teach Mode & Kham Mueang
- App Icons
- ORT WASM Copy Script
- Vercel Headers
- Audio Clip Manifest
- Out of Scope

## God Nodes (most connected - your core abstractions)
1. `db()` - 31 edges
2. `Settings()` - 26 edges
3. `DevBenchmark()` - 21 edges
4. `Aspect` - 16 edges
5. `react` - 15 edges
6. `TopBar()` - 15 edges
7. `Insights()` - 14 edges
8. `compilerOptions` - 14 edges
9. `Student` - 14 edges
10. `Teach()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Embedding parity Python fp32 vs q8 ONNX (cosine > 0.99)` --semantically_similar_to--> `DevParity page (#/dev/parity, cosine > 0.99)`  [INFERRED] [semantically similar]
  docs/benchmarks.md → README.md
- `Responsible AI doc` --references--> `Guardrails (human final call, no actions, no hallucination)`  [INFERRED]
  docs/responsible_ai.md → spec.md
- `multilingual-e5-small` --references--> `multilingual-e5-small embeddings`  [INFERRED]
  docs/datasets.md → spec.md
- `NLLB-200-distilled-600M` --references--> `NLLB-200-distilled-600M translator`  [INFERRED]
  docs/datasets.md → spec.md
- `Writing human_test.jsonl guidelines` --references--> `Label schema (aspects, sentiment, flags)`  [INFERRED]
  ml/data/README.md → spec.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **On-device inference stack** — spec_whisper, spec_multilingual_e5_small, spec_classifier_heads, spec_nllb_200, spec_transformers_js [EXTRACTED 1.00]
- **Teacher-student distillation flow** — spec_gen_synthetic, spec_synthetic_data, ml_train_student, ml_export_heads, spec_classifier_heads, spec_claude_api [EXTRACTED 1.00]
- **Fail-safe / anti-hallucination mechanisms** — spec_processing_uncertainty_rules, spec_not_sure_queue, spec_weak_evidence_badge, spec_thai_templates, spec_evidence_drawer [INFERRED 0.85]
- **Core bundle composition** — readme_core_bundle, docs_benchmarks_whisper_tiny_default, docs_datasets_multilingual_e5_small, readme_heads_json, docs_datasets_recorded_thai_clips [EXTRACTED 1.00]
- **Responsible AI guardrails** — docs_responsible_ai_human_in_the_loop, docs_responsible_ai_fail_safe, docs_responsible_ai_no_hallucinated_content, docs_responsible_ai_privacy, docs_responsible_ai_consent, docs_responsible_ai_lost_phone [EXTRACTED 1.00]
- **Student evaluation flow** — docs_datasets_synthetic_visitor_feedback, docs_eval_synthetic_dev_split, docs_datasets_human_test_set, docs_eval_evaluation_human_test_set, docs_eval_thresholds [INFERRED 0.85]
- **Rao Fang Northern Thai coffee farm tour sequence (walk -> picking -> processing -> tasting -> host)** — app_public_tour_walk_walk_trail_stage, app_public_tour_picking_coffee_picking_stage, app_public_tour_processing_processing_roasting_stage, app_public_tour_tasting_tasting_stage, app_public_tour_host_host_hospitality_stage [INFERRED 0.95]

## Communities (27 total, 4 thin omitted)

### Community 0 - "App UI Screens & Components"
Cohesion: 0.06
Nodes (72): AspectPicker(), DecideFooter(), SpeakButton(), Aspect, ASPECT_INFO, AspectInfo, ASPECTS, GUEST_LANGS (+64 more)

### Community 1 - "On-device ML & Data Ops"
Cohesion: 0.11
Nodes (48): deleteAllData(), deleteVisit(), exportDataset(), setSetting(), asrModel, decodeTo16k(), loadAsr(), transcribe() (+40 more)

### Community 2 - "App Shell, PIN & Notes"
Cohesion: 0.11
Nodes (33): App(), NoteEditor(), hashPin(), PinGate(), TopBar(), db(), getSetting(), uid() (+25 more)

### Community 3 - "npm Dependencies"
Cohesion: 0.06
Nodes (36): dependencies, @huggingface/transformers, idb, react, react-dom, devDependencies, fake-indexeddb, @types/react (+28 more)

### Community 4 - "Python Embedder"
Cohesion: 0.13
Nodes (9): e5_aspect_input(), e5_input(), E5Embedder, FakeEmbedder, get_embedder(), coverage_precision(), fit_binary(), main() (+1 more)

### Community 5 - "Datasets & Teacher Model"
Cohesion: 0.13
Nodes (23): Anthropic usage terms check, claude-opus-5-5 teacher, Datasets and models doc, FLORES-200 devtest, Kham Mueang pairs (km_pairs.jsonl), km_normalize_cases.json (JS<->Python parity cases), NLLB-200-distilled-600M, Problem evidence sources (UNWTO, WDI, GSMA) (+15 more)

### Community 6 - "Student Evaluation (eval.py)"
Cohesion: 0.19
Nodes (10): block(), main(), aspect_scores(), fmt(), gold_aspects(), prf(), sentiment_accuracy(), top_errors() (+2 more)

### Community 7 - "Responsible AI & Privacy"
Cohesion: 0.15
Nodes (14): Consent screens, Human in the loop (suggestion only), humanLabels override model, Lost or shared phone risk, No hallucinated content (fixed Thai templates), Persistent storage request, Optional 4-digit PIN (PinGate), Privacy (IndexedDB, nothing uploaded) (+6 more)

### Community 8 - "Entry Page & ML Requirements"
Cohesion: 0.14
Nodes (17): app/index.html entry page, #root mount -> /src/main.tsx, Embedding parity Python fp32 vs q8 ONNX (cosine > 0.99), pythainlp, ML requirements (CPU-only, Python 3.11), scikit-learn, sentence-transformers, transformers (+9 more)

### Community 9 - "Phase 0 Device Benchmarks"
Cohesion: 0.17
Nodes (15): Benchmark decision rules (NLLB>15s, Whisper base>10s, core>200MB), Emulated run (Pixel 7, 4x CPU throttle), Offline fetch log, Phase 0 benchmarks doc, env.useWasmCache = false (dedupe ONNX WASM), whisper-tiny as default ASR, multilingual-e5-small, Whisper base / tiny (ONNX q8) (+7 more)

### Community 10 - "Student Model"
Cohesion: 0.20
Nodes (5): main(), script_matches(), Student, uncertainty_reasons(), word_count()

### Community 11 - "Synthetic Data Generation"
Cohesion: 0.19
Nodes (7): gen_prompt(), label_prompt(), main(), norm_labels(), run_slot(), slots(), Teacher

### Community 12 - "TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noUnusedLocals (+7 more)

### Community 13 - "Head Export & FLORES Eval"
Cohesion: 0.17
Nodes (4): main(), clips(), main(), thai_number()

### Community 14 - "Human Test Set & Distillation"
Cohesion: 0.16
Nodes (12): Human test set (human_test.jsonl), Evaluation doc (human test set), Distillation (Claude teacher -> e5-small + linear heads), Numbers rule (quote only measured numbers with n), Video script draft, cache/ (resume, no double billing), ml/data README, Writing human_test.jsonl guidelines (+4 more)

### Community 15 - "Kham Mueang Eval"
Cohesion: 0.22
Nodes (8): build_dict(), from_export(), held_out(), main(), evaluate(), normalize_km(), thai_boundaries(), n_label()

### Community 16 - "Thai Audio Clips"
Cohesion: 0.18
Nodes (13): purchase_interest missed on Korean example (known gap), Device Thai voice (speechSynthesis), Recorded Thai clips, Insights screen, Aspect name clips (13 aspects), Back-to-back clip playback, Number clips 1-30, Thai audio recording script (55 clips) (+5 more)

### Community 17 - "Uncertainty & Fail-safes"
Cohesion: 0.14
Nodes (11): Coverage / precision-when-sure metrics, q8 quantisation lowers coverage, keeps precision, Interim synthetic dev split results, Thresholds tau_lo=0.65, tau_hi=0.70, Fail-safe (thresholds -> not-sure queue), Machine-translated label next to original, Weak-evidence badge (<3 guests), Not-sure queue + manual tags (+3 more)

### Community 18 - "Coffee Tour Stages"
Cohesion: 0.25
Nodes (10): Tour stage: host hospitality, Host Hospitality Illustration (🏡 farmhouse home), Tour stage: coffee picking, Coffee Picking Illustration (🍒 coffee cherry on green field), Processing & Roasting Illustration (🔥 fire over roasting bench), Tour stage: processing roasting, Coffee Tasting Illustration (☕ coffee cup on wooden table), Tour stage: tasting (+2 more)

### Community 19 - "Thai Speech Playback"
Cohesion: 0.29
Nodes (9): Manifest, playFile(), SpeakResult, speakTextThai(), speakThai(), stopSpeaking(), voicesReady(), NO_VOICE_TH (+1 more)

### Community 20 - "Deploy & Offline Demo"
Cohesion: 0.18
Nodes (8): Airplane-mode demo, COOP/COEP headers, HTTPS deploy (Vercel / Netlify), Offline install on the phone (airplane mode), Translation pack (NLLB, optional), Acceptance criteria (demo checklist), Addendum 2026-10-03 (§16), Android Chrome installable PWA

### Community 21 - "Teach Mode & Kham Mueang"
Cohesion: 0.27
Nodes (10): Localising AI (Kham Mueang learned from Noor), Collecting km_pairs.jsonl via Teach Mode export, Personal dictionary (Kham Mueang -> Central Thai), Teach Mode, Central Thai (bridge language), Kham Mueang (Northern Thai), Noor (farm-tour host user), Noor's notes normalization (teach this word loop) (+2 more)

### Community 22 - "App Icons"
Cohesion: 1.00
Nodes (4): Rao Fang PWA Icon 192px (placeholder), Rao Fang PWA Icon 512px (placeholder), Rao Fang Icon Palette (brown #5b3a1e / red #c0392b), Rao Fang SVG App Icon (tilted red seed/leaf on brown)

## Ambiguous Edges - Review These
- `Rao Fang SVG App Icon (tilted red seed/leaf on brown)` → `Rao Fang PWA Icon 192px (placeholder)`  [AMBIGUOUS]
  app/public/icon-192.png · relation: conceptually_related_to
- `Rao Fang SVG App Icon (tilted red seed/leaf on brown)` → `Rao Fang PWA Icon 512px (placeholder)`  [AMBIGUOUS]
  app/public/icon-512.png · relation: conceptually_related_to

## Knowledge Gaps
- **91 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 136 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Rao Fang SVG App Icon (tilted red seed/leaf on brown)` and `Rao Fang PWA Icon 192px (placeholder)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Rao Fang SVG App Icon (tilted red seed/leaf on brown)` and `Rao Fang PWA Icon 512px (placeholder)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react` connect `App Shell, PIN & Notes` to `App UI Screens & Components`, `Thai Speech Playback`, `npm Dependencies`, `On-device ML & Data Ops`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `Evaluation doc (human test set)` connect `Human Test Set & Distillation` to `Uncertainty & Fail-safes`, `Python Embedder`, `Datasets & Teacher Model`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `ML pipeline reproduction (CPU only)` connect `Entry Page & ML Requirements` to `Python Embedder`, `Datasets & Teacher Model`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Settings()` (e.g. with `reprocessAll()` and `deletePack()`) actually correct?**
  _`Settings()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._