# Video script draft (2–5 min) — agent draft, Martin edits

> Numbers rule (spec §16.5): quote only numbers that exist in `docs/eval.md`, `docs/km_eval.md`, `docs/benchmarks.md`.
> Every number spoken gets its n. If n < 30, say “indicative only” and draw no conclusion. All `[TODO]` slots below
> are empty on purpose.

**1. Problem (20 s)** — On screen: Noor's farm (own footage).
“Noor grows coffee in the hills of Chiang Rai and hosts six or seven foreign visitors a month. When they leave, she has no
way to know what they loved, what didn't work, or what they'd buy — they write in English, Chinese and Korean.
Because of Rao Fang, Noor will know which parts of her tour visitors value and what they would buy, every week.
We know this gap is real because [TODO evidence: UN Tourism / WDI Thailand figure, year; Annex C].”

**2. Noor's day (20 s)** — tour ends → phone handed to guest → weekend review with her daughter's phone.

**3. Demo, airplane mode ON (90 s)** — show the airplane icon first.
- Guest picks 한국어 → consent → 👍/👎 on photos → speaks feedback → transcript appears → edits → send.
- Noor opens ดูสรุป: “แขก 5 คนชอบการชิมกาแฟ”, tap 🔊 (recorded Thai clips), open evidence: original Korean + Thai translation labelled machine-translated (or labels only, if the pack isn't installed).
- An ambiguous comment lands in “ไม่แน่ใจ — ให้คนช่วยดู”; Noor tags it with two taps.
- Teach Mode: Noor types a Kham Mueang word; writes a note in Kham Mueang on a card; it normalises to Thai; an unknown word shows “สอนคำนี้”.

**4. Why AI, and why this AI (30 s)** — Photo ratings say *that* the walk was bad; text says *why* (“too steep for my parents”) and catches “I'd buy two bags”. Distillation: Claude labels synthetic feedback, a small student (e5-small + linear heads) learns it and runs on the phone. Sizes: core [TODO MB, measured], translation pack [TODO MB, optional].

**5. Evidence (30 s)** — Human test set: micro-F1 [TODO] (n = [TODO]) overall; per language [TODO with n; “indicative only” if n < 30]. Coverage [TODO]: the tool says “not sure” on [TODO]% of items and is [TODO] precise when it doesn't. Kham Mueang chrF before/after [TODO, n]. What the data doesn't cover: synthetic training text, small human test written by friends, one family's Kham Mueang.

**6. Guardrails & privacy (20 s)** — suggestions only; nothing sent anywhere; consent screens; delete-all; the phone-loss risk stated honestly.

**7. Localising AI (30 s)** — Thai is the bridge, but Noor thinks in Kham Mueang, which no model here supports — verified, not assumed. So the tool learns her words from her, one at a time, and asks when it doesn't understand. What doesn't transfer: the dictionary is hers alone. Next: pooled insights for the cooperative, Kham Mueang ASR from consented recordings, other settings (e.g. Wolof as a bridge language with a voice-only UI).
