# Responsible AI

How each guardrail in spec §2 / §10 is implemented, with pointers to the code.

## Human in the loop
- The app **only suggests**. It never sends, posts, books, replies or contacts anyone: there is no network code
  after model download (Insights, Teach and Guest modes make no requests; see the offline fetch logger below).
- Every insight card ends with **“คำแนะนำเท่านั้น คุณเป็นคนตัดสินใจ”** (“Suggestion only. You decide.”) — `components/Footer.tsx`.
- Items the classifier is unsure about are never counted; Noor or her daughter tags them manually with aspect buttons
  (`components/AspectPicker.tsx`). Manual tags are stored as `humanLabels` and always override the model (`insights/engine.ts`).

## Fail-safe
- Thresholds (`config/thresholds.ts`, tuned values shipped in `heads.json`): an aspect counts only at p ≥ τ_hi;
  any aspect between τ_lo and τ_hi, no aspect ≥ τ_hi, fewer than 3 words, or text not in the chosen language's script
  → **“ไม่แน่ใจ” (not sure)** queue with the original text (`ml/uncertainty.ts`). Any processing error also lands there.
- If `heads.json` is missing, every item goes to the not-sure queue — the tool degrades to “show me the quotes”, never to guessing.
- **Weak-evidence badge** “ข้อมูลน้อย ยังสรุปไม่ได้” on any card with fewer than 3 guests.
- The **original text is always shown** next to a translation, and translations carry a “แปลโดยเครื่อง” (machine-translated) label.
  Without the translation pack, the original + Thai aspect/sentiment labels are shown, with a note.

## No hallucinated content
- No generative model produces Noor-facing text. Insight sentences are fixed Thai templates filled with counts and
  aspect names (`config/thai_templates.ts`); evidence is real guest quotes. The only free-text model output shown is the
  NLLB translation of a real quote, always labelled and always next to the original.

## Privacy
- All data lives in IndexedDB on the phone (`db/db.ts`). Nothing is uploaded.
- Guest audio is decoded in memory, transcribed, and discarded; it is never stored (`screens/Guest.tsx`).
  Audio is stored only when Noor deliberately taps record in Teach Mode Word mode.
- No names or contact details are collected from guests. Helper mode stores no names.
- Export is only by explicit tap (Settings → ส่งออกข้อมูล) and excludes audio.
- Dev check: `dev/offlineFetchLog.ts` logs every fetch made while offline; shown on DevBenchmark.

## Consent
- Guest consent screen in the guest's language (what is collected, stays on the phone, anonymous, can skip),
  stored with timestamp and text version, including refusals (`i18n/guest.ts`).
- Teach Mode consent before first use; Helper mode has a separate consent: the helper is a minor and Noor consents as parent.
  Either can delete entries in “พจนานุกรมของฉัน” or Settings.
- Delete controls: per guest visit, per dictionary entry, per note, and delete-all.

## Lost or shared phone — stated plainly
The data sits in Chrome's storage on the **daughter's phone**. Anyone who can unlock that phone and open the app can read
guest feedback, Noor's notes and the dictionary. Browser storage is **not encrypted** by this app.
Mitigations: optional 4-digit PIN on Noor's screens (a convenience lock against casual access, not encryption —
`components/PinGate.tsx`); delete-all in Settings; no names collected; Chrome “clear site data” also wipes everything.
Persistent storage is requested (`storage.ts`) so models and data are not silently evicted; if it is not granted,
Settings says so in Thai.

## Bias and uneven performance
- Performance is reported **per language** with n next to every number (`docs/eval.md`, `docs/km_eval.md`).
  Groups with n < 30 are labelled “indicative only” and not interpreted.
- Known gaps: the classifier is trained on Claude-written text; Thai has fewer synthetic items (~150 planned vs ~450);
  Kham Mueang is the weakest part of the system — there is no Kham Mueang speech recognition or translation at all
  (verified: neither Whisper nor NLLB lists Northern Thai), only a personal word dictionary.
- **TODO [MANUAL]:** fill in the numbers once `eval.py` / `km_eval.py` have run on real data.
