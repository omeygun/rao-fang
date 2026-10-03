# Graph Report - Noor  (2026-10-03)

## Corpus Check
- Corpus is ~3,855 words - fits in a single context window. You may not need a graph.

## Summary
- 63 nodes · 96 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.83)
- Token cost: 86,592 input · 0 output

## Community Hubs (Navigation)
- Product & Users
- ML Training Pipeline
- Classification & Insights UX
- Model Stack & Distillation
- Deployment Addendum (§16)
- Privacy & Storage
- Out of Scope

## God Nodes (most connected - your core abstractions)
1. `multilingual-e5-small embeddings` - 7 edges
2. `'Not sure, ask a person' review queue` - 6 edges
3. `Insights screen` - 6 edges
4. `ML pipeline (Python, CPU only)` - 6 edges
5. `Addendum 2026-10-03 (§16)` - 6 edges
6. `Rao Fang (offline visitor-feedback tool)` - 5 edges
7. `Hard constraints (brief §06)` - 5 edges
8. `Whisper ASR (Xenova/whisper-base, fallback whisper-tiny)` - 5 edges
9. `NLLB-200-distilled-600M translator` - 5 edges
10. `Phase 0 device benchmark` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Offline / airplane-mode operation` --conceptually_related_to--> `navigator.storage.persist() persistent storage`  [INFERRED]
  spec.md → spec.md  _Bridges community 0 → community 4_
- `train_student.py` --shares_data_with--> `multilingual-e5-small embeddings`  [INFERRED]
  spec.md → spec.md  _Bridges community 3 → community 1_
- `Evidence drawer (original + Thai translation)` --conceptually_related_to--> `Optional NLLB translation pack (ชุดแปลภาษา)`  [INFERRED]
  spec.md → spec.md  _Bridges community 2 → community 4_
- `Personal km->th dictionary` --shares_data_with--> `km_pairs.jsonl (Kham Mueang pairs)`  [INFERRED]
  spec.md → spec.md  _Bridges community 0 → community 1_
- `Rao Fang (offline visitor-feedback tool)` --references--> `Guardrails (human final call, no actions, no hallucination)`  [EXTRACTED]
  spec.md → spec.md  _Bridges community 0 → community 2_

## Hyperedges (group relationships)
- **On-device inference stack** — spec_whisper, spec_multilingual_e5_small, spec_classifier_heads, spec_nllb_200, spec_transformers_js [EXTRACTED 1.00]
- **Teacher-student distillation flow** — spec_gen_synthetic, spec_synthetic_data, spec_train_student, spec_export_heads, spec_classifier_heads, spec_claude_api [EXTRACTED 1.00]
- **Fail-safe / anti-hallucination mechanisms** — spec_processing_uncertainty_rules, spec_not_sure_queue, spec_weak_evidence_badge, spec_thai_templates, spec_evidence_drawer [INFERRED 0.85]

## Communities (7 total, 1 thin omitted)

### Community 0 - "Product & Users"
Cohesion: 0.19
Nodes (11): Acceptance criteria (demo checklist), Central Thai (bridge language), Hack-Nation x World Bank Small AI for Development (Tourism track, Annex C), Android Chrome installable PWA, Kham Mueang (Northern Thai), Noor (farm-tour host user), Noor's notes normalization (teach this word loop), Personal km->th dictionary (+3 more)

### Community 1 - "ML Training Pipeline"
Cohesion: 0.21
Nodes (12): chrF metric (sacrebleu), docs/datasets.md, eval.py -> docs/eval.md, export_heads.py, flores_eval.py (FLORES-200 chrF), gen_synthetic.py (Claude teacher), human_test.jsonl (human test set), km_eval.py -> docs/km_eval.md (+4 more)

### Community 2 - "Classification & Insights UX"
Cohesion: 0.22
Nodes (7): Logistic-regression classifier heads (heads.json), Evidence drawer (original + Thai translation), Insights screen, Label schema (aspects, sentiment, flags), 'Not sure, ask a person' review queue, purchase_interest aspect, Weak-evidence badge (n < 3)

### Community 3 - "Model Stack & Distillation"
Cohesion: 0.24
Nodes (6): docs/benchmarks.md, Claude API (Anthropic), multilingual-e5-small embeddings, NLLB-200-distilled-600M translator, transformers.js, Video outline (docs/video_script.md)

### Community 4 - "Deployment Addendum (§16)"
Cohesion: 0.29
Nodes (4): Addendum 2026-10-03 (§16), Settings screen, Web Speech API speechSynthesis (Thai TTS), Optional NLLB translation pack (ชุดแปลภาษา)

### Community 5 - "Privacy & Storage"
Cohesion: 0.47
Nodes (3): Guest Mode screen, IndexedDB storage (idb), Responsible AI (docs/responsible_ai.md)

## Knowledge Gaps
- **4 isolated node(s):** `Hack-Nation x World Bank Small AI for Development (Tourism track, Annex C)`, `Android Chrome installable PWA`, `docs/benchmarks.md`, `Out of scope / what happens next`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 7 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `multilingual-e5-small embeddings` connect `Model Stack & Distillation` to `ML Training Pipeline`, `Classification & Insights UX`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `'Not sure, ask a person' review queue` connect `Classification & Insights UX` to `Product & Users`, `Privacy & Storage`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Why does `Sample sizes in evaluation reports (n < 30 indicative only)` connect `Classification & Insights UX` to `ML Training Pipeline`, `Model Stack & Distillation`, `Deployment Addendum (§16)`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `'Not sure, ask a person' review queue` (e.g. with `Guardrails (human final call, no actions, no hallucination)` and `Weak-evidence badge (n < 3)`) actually correct?**
  _`'Not sure, ask a person' review queue` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Hack-Nation x World Bank Small AI for Development (Tourism track, Annex C)`, `Android Chrome installable PWA`, `docs/benchmarks.md` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._