# SPEC — "Rao Fang" (เราฟัง, "we listen"): offline visitor-feedback tool for a smallholder farm-tour host

Hack-Nation × World Bank "Small AI for Development" — Tourism track (Annex C)
Builder: solo. **Hard deadline: Sunday Oct 4, 09:00 ET.** Build must be demoable on an Android phone in airplane mode.

> Instructions to the building agent: build in the priority order in §12. Do **Phase 0** first and report the benchmark numbers before building anything heavy. Where this spec says **[MANUAL]**, do not fake it. Leave a clear TODO and a script or template for the human. Never invent evaluation numbers, datasets, or citations.

---

## 1. Problem and user

**User:** Noor, 38, coffee farmer in the northern Thai highlands (Chiang Rai / Chiang Mai). She runs informal farm tours for about 6–7 foreign visitors a month, by word of mouth. Local language: **Kham Mueang (Northern Thai)**. Interface/bridge language: **Central Thai** (she is bilingual). She has a basic phone. The household smartphone (Android, mid-range) belongs to her daughter, who is home on weekends.

**Gap (from Annex C):** once visitors leave, Noor has no way of knowing what they valued, what didn't work, or what they would pay for. Visitors write and speak **English, Mandarin Chinese, Korean**, which she cannot read.

**One workflow:** *learning from visitor feedback.*
1. At the end of the tour, the guest gives feedback on the phone, **offline**.
2. On-device AI classifies it, translates it into Thai, and flags uncertainty.
3. On the weekend, Noor reviews **Thai audio and visual insights** and decides what to change. The AI only suggests.

**Problem statement (brief's template; fill in the evidence [MANUAL]):**
"Because of this tool, Noor will know which parts of her farm tour visitors value and what they would buy, by the end of each week, which she would otherwise never learn because visitors leave without a shared language; we know because [evidence: UN Tourism / WDI Thailand tourism figures + Annex C]."

## 2. Hard constraints (from the brief, §06)

1. Runs on a device the user already has → **Android Chrome, installable PWA**.
2. **Core feature works offline** → after a one-time model download, the whole feedback → insight loop works in airplane mode.
3. Model files small enough to side-load or download over a weak link → target total **≤ 500 MB**, stretch ≤ 300 MB. Report the actual sizes.
4. At least one interaction in a **named local language** → **Kham Mueang**, in Teach Mode and in Noor's notes (§6.5), via a personal dictionary that normalizes it to Central Thai. Be honest that Kham Mueang speech recognition is not supported.

**Guardrails (pass/fail):** human makes the final call. The tool never sends, posts, books, or acts. Low confidence → "not sure, ask a person" plus the original text. No hallucinated content: insights are built from counts and real quotes, never free generation.

## 3. Architecture

```
┌──────────────── Android phone (Chrome PWA, offline) ────────────────┐
│ React + Vite + TypeScript UI                                         │
│  ├─ Guest Mode ── MediaRecorder ─► Whisper (ASR, en/zh/ko)           │
│  │                text input ─────────────┐                          │
│  ├─ Classifier: multilingual-e5-small embeddings (ONNX)              │
│  │              + logistic-regression heads (JSON, run in JS)        │
│  ├─ Translator: NLLB-200-distilled-600M (ONNX, quantized) → Thai     │
│  │              (run lazily, only for quotes shown to Noor)          │
│  ├─ Insights engine: counts + thresholds + real quotes + Thai        │
│  │              templates (NO LLM)                                   │
│  ├─ Thai audio: Web Speech API speechSynthesis (device Thai voice)   │
│  ├─ Kham Mueang dictionary: normalize → Thai (rule-based lookup)     │
│  └─ Storage: IndexedDB (idb) — all data stays on device              │
│ Service worker (vite-plugin-pwa) caches app shell; models cached     │
│ by transformers.js in browser Cache Storage                          │
└──────────────────────────────────────────────────────────────────────┘
┌──────────────── Laptop, CPU only (Python 3.11) ─────────────────────┐
│ Teacher: Claude API → synthetic labeled feedback (en/zh/ko/th)       │
│ Student: frozen multilingual-e5-small + sklearn LogisticRegression   │
│ Export heads → JSON; evaluate on HUMAN test set; FLORES subsample    │
└──────────────────────────────────────────────────────────────────────┘
```

**Key design decision:** classify the **original-language text** with a multilingual encoder, and translate to Thai **only for display**. This keeps classification fast and independent of the heavy translation model. If translation is slow or fails, insights still work.

**Distillation story:** Claude (teacher) labels feedback, and a ~120 MB on-device student (e5-small + linear heads) learns to imitate those labels. CPU-trainable in minutes, no GPU needed.

## 4. Models

| Role | Model (transformers.js id — **agent must verify it exists and loads**) | Quant | Target size |
|---|---|---|---|
| ASR (guest speech) | `Xenova/whisper-base` (fallback `Xenova/whisper-tiny`) | q8 | ~60–80 MB |
| Embeddings | `Xenova/multilingual-e5-small` | q8 | ~120 MB |
| Classifier heads | own, JSON (logreg weights) | fp32 | < 1 MB |
| Translation → Thai | `Xenova/nllb-200-distilled-600M` | q8 | ~600 MB+ (see Phase 0) |
| Thai TTS | device voice via `speechSynthesis` | — | 0 MB |

NLLB language codes: `eng_Latn`, `zho_Hans`, `kor_Hang` → `tha_Thai`.
e5 requires the `"query: "` prefix on inputs, and mean pooling + L2 normalize. Match training and inference exactly.

### Phase 0 — device benchmark (do first, report numbers)
Build a bare test page that downloads and caches each model, then, **in airplane mode on the Android phone**, times:
- Whisper base: 10 s of English audio → text
- e5-small: embed one 30-word sentence
- NLLB: translate one 30-word English sentence → Thai
- peak memory (Chrome `performance.memory` if available) and any crash

Show WebGPU availability, and fall back to WASM.

**Decision rules:**
- NLLB > 15 s or crashes → (a) try a smaller quantization (q4) if available; (b) else ship translation as **"translate on demand"** (one quote at a time, with a spinner) and say so in the video; (c) last resort: show the original quote plus the classifier's Thai aspect labels only, and report translation as a known limitation.
- Whisper base > 10 s → use whisper-tiny; if quality is unusable for zh/ko, guest input becomes text-only for those languages.

Record all Phase 0 results in `docs/benchmarks.md` (device model, Android version, Chrome version, timings, sizes).

## 5. Label schema (shared by teacher, student, UI)

**Aspects** (multi-label):
`walk_trail`, `coffee_picking`, `processing_roasting`, `tasting`, `guide_communication`, `host_hospitality`, `food`, `price_value`, `scenery`, `logistics_directions`, `group_size_timing`, `purchase_interest` (wants to buy beans or products), `other`

**Per aspect mentioned:** `sentiment ∈ {positive, negative, mixed}`

**Item-level flags:** `is_suggestion` (bool), `language` (en/zh/ko/th)

**Student implementation:** one binary logreg per aspect (one-vs-rest) on the e5 embedding. Sentiment is one 3-class logreg on `[embedding]`, trained on (text, aspect, sentiment) rows with the aspect name appended to the text as `"query: {text} [aspect: {aspect}]"`. If time is short, use a single item-level sentiment head instead and note the simplification.

Thai display names, icons, and photo slots for each aspect live in `app/src/config/aspects.ts`.

## 6. App: screens and behavior

All Noor-facing UI is in **Thai**, with large tap targets, icons, and a 🔊 button on every insight. Guest UI is in the guest's chosen language (en/zh/ko).

### 6.1 Home (Noor)
Three big buttons: **ให้แขกรีวิว** (Guest feedback), **ดูสรุป** (Insights), **สอนภาษาเมือง** (Teach Kham Mueang). Plus a settings gear. An offline status chip shows whether models are cached.

### 6.2 Guest Mode
1. **Language picker:** EN / 中文 / 한국어.
2. **Consent screen** (in the guest's language): what is collected, that it stays on this phone, that it's anonymous by default, and that they can skip. Buttons: Agree / Skip feedback. Store the consent record with a timestamp.
3. **Photo ratings:** one card per tour step (walk, picking, processing, tasting, host) → 👍 / 👎 / skip. Photos come from `app/public/tour/*.jpg` **[MANUAL: Martin supplies his own or licensed photos; until then, use generic illustrated placeholders. No copyrighted images.]**
4. **Open question:** "What would make this better? Anything you'd buy?" Input by 🎤 voice (Whisper, with language forced to the chosen one) or by text. Show the transcript so the guest can edit it.
5. **Thank-you screen.** Save everything to IndexedDB, then run classification in the background.

### 6.3 Processing (on device, background)
For each feedback item:
- embed → aspect probabilities + sentiment
- **uncertainty rules:**
  - an aspect counts as present if p ≥ τ_hi (default 0.6)
  - if p is between τ_lo (0.35) and τ_hi for any aspect, or **no aspect** ≥ τ_hi → mark the item **"ไม่แน่ใจ" (not sure)** and send it to the review queue
  - if text is under 3 words or the script doesn't match the chosen language → also "not sure"
  - thresholds live in config; tune τ on the dev split and record the values used
- translation to Thai: lazy, cached per item, with a "machine-translated" label

### 6.4 Insights (Noor)
- **Period selector:** this week / this month / all.
- **Aspect cards**, sorted by mention count: icon + Thai name + 👍/👎 counts (from photo ratings + text) + one-line Thai template, e.g. "แขก 5 คนชอบการชิมกาแฟ" ("5 guests liked the coffee tasting").
  - **Weak-evidence badge** if n < 3: "ข้อมูลน้อย ยังสรุปไม่ได้" ("too little data to conclude").
  - Tap a card → **evidence drawer** with the real quotes: original + Thai translation + "machine-translated" label.
- **"Visitors want to buy" card** for `purchase_interest` mentions.
- **"Suggestions" card** for `is_suggestion` items.
- **"ไม่แน่ใจ — ให้คนช่วยดู"** (not sure, ask a person) queue: items the AI couldn't classify confidently, shown with the original text. Noor or her daughter can tag them manually with aspect buttons. Store manual tags as human labels.
- 🔊 reads the card's Thai sentence aloud. If no Thai voice is installed, show an instruction to install one.
- **No generated prose.** All sentences come from fixed Thai templates filled with counts and aspect names.
- A footer on every insight: "คำแนะนำเท่านั้น คุณเป็นคนตัดสินใจ" ("Suggestion only. You decide.").

### 6.5 Teach Mode (Kham Mueang) — the local-language interaction
Three sub-modes, all opt-in. **No passive recording, ever.**
1. **Word:** show an icon + Central Thai word from `teach_words.json` (~100 farm, tour, and feedback words). Noor types the Kham Mueang spelling (audio recording optional; store audio only if recorded deliberately).
2. **Sentence swap:** show and read aloud a Thai sentence with one highlighted word. Noor types the same sentence with that word in Kham Mueang. Store (thai_sentence, km_sentence, aligned word pair).
3. **Helper translate:** Noor enters a Kham Mueang sentence; the helper (daughter) enters the Central Thai version. Store the pair. A consent note says the helper is a minor and Noor consents as parent; either can delete.

**Personal dictionary:** a km→th word map built from all three modes plus corrections. Used by:
- **Noor's notes:** on any insight card, Noor can add a note in Kham Mueang ("I'll shorten the walk"). The note is normalized to Thai with the dictionary (longest-match replacement over Thai script), and the normalized text is shown. Unknown tokens are highlighted with a "สอนคำนี้" (teach this word) button, which opens Word mode prefilled. This is the "ask when not understood" loop.

### 6.6 Settings
- model download status and sizes; re-download button
- delete all data / delete per item
- **export** dataset (JSON: feedback, human labels, Kham Mueang pairs), for consented contribution later
- language voice check (lists available `speechSynthesis` voices)

## 7. Data storage (IndexedDB, `idb`)
Stores: `consents`, `visits`, `ratings`, `feedback` (text, lang, audio? = no audio stored by default, model outputs, uncertainty flag, thai_translation, human_labels), `km_dictionary`, `km_pairs`, `notes`, `settings`.
No network calls after model caching. Add a dev check that logs any fetch made in offline mode.

## 8. ML pipeline (Python, CPU only) — `ml/`

```
ml/
  requirements.txt        # anthropic, sentence-transformers, scikit-learn, pandas, numpy, sacrebleu, datasets
  schema.py               # aspects, sentiments (mirror of §5)
  gen_synthetic.py        # Claude teacher → data/synthetic.jsonl
  train_student.py        # e5-small embeddings + logreg heads
  export_heads.py         # → app/public/models/heads.json (weights, bias, thresholds, label names)
  eval.py                 # → docs/eval.md
  km_eval.py              # Kham Mueang normalization before/after
  flores_eval.py          # optional: NLLB en/zh/ko→th on FLORES-200 devtest subsample (CPU)
  data/
    synthetic.jsonl       # labeled, source="synthetic-claude"
    human_test.jsonl      # [MANUAL] human-written, NEVER used for training
    km_pairs.jsonl        # [MANUAL] Kham Mueang ↔ Thai from family
```

### 8.1 gen_synthetic.py
- Uses the Anthropic API (key from `ANTHROPIC_API_KEY`). Model name is configurable via a CLI flag. Don't hardcode an assumed model id.
- Generates **~1,500 items**: ~450 each in en/zh/ko, plus ~150 th. Varied length (3–80 words), tone, typos, mixed and multi-aspect cases, neutral and off-topic items, sarcasm, and purchase interest. Each item has full labels per §5.
- Two-step: generate text, then have the teacher **re-label** in a separate call (reduces label leakage). Drop items where the labels disagree, and log the agreement rate.
- Every row: `{"id", "text", "lang", "aspects":[{"aspect","sentiment"}], "is_suggestion", "source":"synthetic-claude", "prompt_version"}`.
- Batch requests, cache responses to disk, and resume on failure.

### 8.2 train_student.py
- Embed with `intfloat/multilingual-e5-small` (same pooling and prefix as the app). **Verify parity:** embed 5 sentences in Python and in transformers.js and assert cosine > 0.99. Put the JS check in a dev page.
- 85/15 train/dev split of the synthetic data, stratified by language.
- LogisticRegression (`class_weight="balanced"`), one per aspect, plus the sentiment head.
- Tune τ_lo / τ_hi on dev for a good trade-off between coverage (share of items auto-classified) and precision. Report both.
- Runtime target: < 15 min on a laptop CPU.

### 8.3 eval.py → docs/eval.md
On **`human_test.jsonl` only**:
- per-language and overall: micro/macro F1 for aspects, sentiment accuracy
- **coverage vs. precision at the chosen thresholds** (how often the tool says "not sure", and how accurate it is when it doesn't)
- a confusion summary of the top error types
- **synthetic dev vs. human test gap**, stated plainly
- n per language, and a warning if n < 30

### 8.4 km_eval.py → docs/km_eval.md
On held-out Kham Mueang pairs (≥ 20% of `km_pairs.jsonl`, never added to the dictionary):
- chrF (sacrebleu) of raw Kham Mueang vs. the Thai reference, compared with **dictionary-normalized** Kham Mueang vs. the Thai reference
- the share of tokens covered by the dictionary
- report as "before / after", with n

### 8.5 flores_eval.py (optional, P2)
NLLB on a 200-sentence FLORES-200 devtest subsample, en/zh/ko→th, chrF. CPU, can run overnight.

## 9. Evaluation and honesty requirements (scored)
`docs/datasets.md` table, one row per dataset: name, source/URL, license, size, used for (train/test/display), **what it does NOT cover**. Must include:
- synthetic Claude data: LLM-written, not real guests; likely cleaner than real speech; no real code-switching; Korean/Chinese slang underrepresented
- human test set: small, written by Martin and friends, not real visitors
- Kham Mueang pairs: a few speakers from one family/area, not representative of all Northern Thai variation; spelling is improvised in Thai script
- pretrained models (Whisper, e5, NLLB): license plus known gaps. Whisper Thai ASR does **not** handle Kham Mueang; NLLB has no Kham Mueang. The agent must verify NLLB's language list before stating this.
- **[MANUAL]** problem-evidence sources (UN Tourism / WDI Thailand, GSMA, Isan/Kham Mueang sociolinguistic sources), with year

**[MANUAL] check:** Anthropic's usage terms regarding using outputs to train models. A small task classifier is likely fine, but confirm and note it in `datasets.md`.

## 10. Responsible AI (pass/fail) — `docs/responsible_ai.md`
- **Human in the loop:** suggestions only; no sending, posting, or booking; manual tagging for uncertain items
- **Fail-safe:** thresholds, "not sure" queue, weak-evidence badges, original text always visible next to translations
- **Privacy:** all data on device; no audio stored unless deliberately recorded in Teach Mode; no network after setup; export only on explicit action
- **Consent:** guest consent screen; Teach Mode consent, including the minor helper with parental consent; delete controls
- **Lost or shared phone:** data sits in browser storage on the daughter's phone. State the risk plainly. Mitigation: optional 4-digit PIN to open Noor's screens (P1), delete-all in settings, and no names collected.
- **Bias:** report performance per language; Kham Mueang is weakest, shown with numbers
- **Hallucination:** no generative text in insights; templates + counts + real quotes only

## 11. Acceptance criteria (demo checklist)
- [ ] PWA installed on the Android phone; models cached; **airplane mode ON**
- [ ] guest in Korean: consent → ratings → voice feedback → transcript → saved
- [ ] insights show the aspect counts, Thai template sentence, 🔊 Thai audio, evidence drawer with original + Thai translation
- [ ] a deliberately ambiguous feedback lands in the "not sure" queue; manual tag works
- [ ] Teach Mode adds a Kham Mueang word; Noor's note with that word normalizes correctly; an unknown word triggers "teach this word"
- [ ] delete-all works
- [ ] `docs/benchmarks.md`, `docs/eval.md`, `docs/km_eval.md`, `docs/datasets.md`, `docs/responsible_ai.md` exist with **real** numbers or explicit TODOs
- [ ] total model download size measured and stated

## 12. Priority order and timebox (ET; solo; deadline Sun 09:00)

| Window (ET) | Work | Priority |
|---|---|---|
| Sat 15:00–17:00 | Phase 0 benchmark on phone; scaffold PWA | **P0** |
| Sat 15:30 (parallel) | start `gen_synthetic.py` running | **P0** |
| Sat 17:00–21:00 | Guest Mode + processing + Insights with templates | **P0** |
| Sat 19:00–20:00 | train student, export heads, wire into app | **P0** |
| Sat 20:00–23:00 | **[MANUAL]** Kham Mueang pairs from family (Thailand is ET+11, so 07:00–10:00 Sunday there) + write `human_test.jsonl` | **P0** |
| Sat 23:00–01:00 | Teach Mode + dictionary + notes; eval scripts | P1 |
| Sun 01:00–03:00 | docs (datasets, responsible AI, eval); PIN; polish | P1 |
| Sun 03:00–05:00 | sleep / buffer | — |
| Sun 05:00–08:00 | record the video (2–5 min) | **P0** |
| Sun 08:00–08:45 | submit repo + video; buffer | **P0** |

**Cut list if behind** (cut in this order): FLORES eval → PIN → sentence-swap and helper modes (keep Word mode) → voice input for zh/ko (text only) → lazy translation (show original + Thai aspect labels).

**Never cut:** airplane-mode demo, "not sure" fail-safe, consent, human test set eval, datasets table, video.

## 13. Repo layout
```
/app            React + Vite + TS PWA
  src/config/aspects.ts, thai_templates.ts, teach_words.json
  src/ml/       asr.ts, embed.ts, classify.ts (heads.json), translate.ts, kmNormalize.ts
  src/db/       idb schema + helpers
  src/screens/  Home, Guest*, Insights, Teach*, Settings, DevBenchmark, DevParity
  public/models/heads.json, public/tour/*.jpg
/ml             see §8
/docs           benchmarks.md, eval.md, km_eval.md, datasets.md, responsible_ai.md, video_script.md
README.md       setup, offline install steps, model sizes, how to reproduce eval
```

## 14. Out of scope (state in the video as "what happens next")
Enquiry replies with RAG over Noor's fact cards; multilingual listing from a Thai voice note; bean sales; pooled insights across the cooperative (also fixes small data volume); Kham Mueang ASR via unlabeled-audio adaptation; consented contribution to Mozilla Common Voice; adapting to other settings (e.g. rural Senegal with Wolof as the bridge language and a voice-only UI).

## 15. Video outline — `docs/video_script.md` (agent drafts, Martin edits)
1. Problem statement (template, with evidence) — 20 s
2. Noor's day and where the tool fits — 20 s
3. Demo in airplane mode: guest → insights → "not sure" → Teach Mode — 90 s
4. AI and why not SMS / a form: picture ratings vs. what text AI catches; distillation; sizes — 30 s
5. Evidence: human-test F1 per language, coverage/precision, Kham Mueang before/after, what the data doesn't cover — 30 s
6. Guardrails and privacy — 20 s
7. Your take: localizing AI (Thai-built context, Kham Mueang, what doesn't transfer) — 30 s

## 16. Addendum (2026-10-03) — overrides earlier sections where they conflict

### 16.1 Hosting and HTTPS from day one
Deploy the PWA to **Vercel or Netlify** from Phase 0 and test the phone **only over that HTTPS URL** (the mic needs a secure context; no LAN-IP testing). Serve every response with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless` if `require-corp` blocks a resource), via `vercel.json` headers or Netlify `_headers`, so `SharedArrayBuffer` and multithreaded WASM work. Model downloads are CORS fetches and must keep working under COEP; verify. DevBenchmark shows `crossOriginIsolated`, `navigator.hardwareConcurrency` and the WASM thread count actually used, and `docs/benchmarks.md` records the timings with threads on.

### 16.2 Persistent storage
On first launch (and again after the models finish downloading) call `navigator.storage.persist()`. Settings shows the result of `navigator.storage.persisted()` (granted / not granted, in Thai) and `navigator.storage.estimate()` usage and quota. If not granted, show a short Thai note that Chrome may delete the models and data under storage pressure, and that installing the PWA to the home screen makes it more likely to be granted. Re-request from a button in Settings.

### 16.3 Thai audio: pre-recorded clips first
The 🔊 button on each insight plays **pre-recorded Thai clips** as the primary source; `speechSynthesis` is the fallback only. Because templates contain counts and aspect names, clips are short fragments joined in sequence: each template fragment, each of the 13 aspect names, and numbers 1–30 (larger numbers fall back to `speechSynthesis`). Clips live in `app/public/audio/th/` with a manifest mapping fragment id → file, use a format Android Chrome plays (mp3 or m4a), and are precached by the service worker as part of the core bundle (target < 5 MB). If any clip needed by a sentence is missing, play the whole sentence with `speechSynthesis`; if no Thai voice exists either, show the install-a-Thai-voice instruction. **[MANUAL]** Clips are recorded by a Thai speaker from a script the agent generates (`scripts/audio_script.md`); do not substitute synthetic TTS output for the recordings.

### 16.4 Size budget: core ≤ 200 MB, translation as an optional pack
This replaces the ≤ 500 MB / ≤ 300 MB targets in §2. **Core bundle** = app shell + Whisper + e5-small + `heads.json` + Thai audio clips, target **≤ 200 MB**, measured as actual bytes in Cache Storage. If Whisper base pushes the core over 200 MB, use whisper-tiny and say so. NLLB is a separate, optional **"translation pack" (ชุดแปลภาษา)** that is not downloaded by default: Settings shows its measured size and a download button with a warning to use Wi-Fi, plus a delete button. Without the pack, the evidence drawer shows the original quote plus the Thai aspect and sentiment labels, with a note that translation is not installed. The full insights loop, including the not-sure queue, must work offline without the pack. Report core and pack sizes separately in README and `docs/benchmarks.md`.

### 16.5 Sample sizes in every evaluation report
`docs/eval.md`, `docs/km_eval.md` and `flores_eval.py` output show **n next to every metric**, per language and overall. For any group with **n < 30**, still print the numbers but label them **"n < 30: indicative only"**, and do not draw conclusions from them: no claims that one language is better or worse, no statements that the model "works" for that group, and no comparisons that rely on that group. The synthetic-vs-human gap and the Kham Mueang before/after follow the same rule. `docs/video_script.md` follows the same rule when quoting numbers.

### 16.6 Acceptance additions
- [ ] App served from the Vercel/Netlify HTTPS URL with `crossOriginIsolated === true` on the phone
- [ ] Settings shows the persistent-storage status
- [ ] 🔊 plays recorded Thai clips, with `speechSynthesis` fallback verified
- [ ] Core bundle measured ≤ 200 MB; insights work offline with the translation pack not installed
- [ ] Every eval table shows n, and groups with n < 30 are labeled and not concluded on
