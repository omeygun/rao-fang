# Pitch video — Rao Fang for agritourism operators

**[`rao-fang-pitch.mp4`](rao-fang-pitch.mp4)** — 3:39, 1920×1080, morph transitions, English, AI narration (ElevenLabs, voice “Matilda”;
disclosed on the closing slide). Built with the `pitch-deck-builder` skill (`.claude/skills/pitch-deck-builder`).

Motion: PowerPoint-style *Morph* built with the View Transitions API — elements that share a `view-transition-name`
across slides glide and resize between scenes (the cover's “Rao Fang” shrinks into the corner wordmark; the brown cover
collapses into a bottom progress bar and expands again for the ask; problem chips become Noor's cards, then the product
loop; the “guest answers” card grows into the phone). Inside scenes, tiles and lists rise in sequence and stats count up.

Audience: an agritourism company. Ask: approval for a real season with real hosts and guests.

## Scenes

| # | Time | Slide | Key claim and its source |
|---|---|---|---|
| 1 | 0:00 | Cover | — |
| 2 | 0:16 | The problem | Guests write EN/ZH/KO; host reads Thai; weak signal (spec §1–2) |
| 3 | 0:34 | Meet Noor | Chiang Rai, ~6–7 foreign visitors a month (spec §1) |
| 4 | 0:50 | One loop | Guest → on-device AI → Thai review; “the AI suggests, the host decides” |
| 5 | 1:07 | **Live app: guest** | Real app recorded: Korean guest, consent, ratings, typed comment, thanks |
| 6 | 1:26 | **Live app: host** | Real app recorded: demo insights with English captions, evidence sheet, “not sure” list |
| 7 | 1:48 | Fail-safe | 69% auto-sorted, 91% precision — synthetic held-out set, n = 275, q8 model (`docs/eval.md`) |
| 8 | 2:10 | Offline | 197 MB core download; 7.7 s for 11 s of speech in emulated Pixel 7 at 4× CPU throttle (`docs/benchmarks.md`) |
| 9 | 2:27 | Local language | Fixed Thai templates; Kham Mueang teach mode; 38 starter words (`docs/datasets.md`) |
| 10 | 2:45 | For your company | Benefits follow from the built features; no revenue or market numbers claimed |
| 11 | 3:05 | Where it stands | Done vs. next, including what is not yet tested |
| 12 | 3:18 | Ask | Approve a real season; rao-fang.vercel.app |

No market sizes, customer numbers or citations are used, because none have been sourced yet (spec: never invent them).
Every metric on screen says how it was measured.

## Rebuild

```bash
cd app && npm run build && npx vite preview --port 4173 --host 127.0.0.1 &   # the app the recorder drives
cd docs/pitch
ELEVENLABS_API_KEY=… python3 tts.py     # only if narration.json changed: new clips + durations.json
P=$PWD node record.mjs                  # plays slides.html, drives the app in the phone frames → rec/raw.webm + timeline.json
python3 mix.py                          # finds scene starts in video time, adds narration, encodes rao-fang-pitch.mp4
```

`record.mjs` needs Playwright with Chromium. Playwright's recorder drifts from wall-clock time under heavy animation, so
the recorder flips the colour of a 16 px strip below the frame at each scene; `mix.py` reads scene starts from that
strip, aligns the narration to them and crops the strip away. Edit text in `slides.html` and `narration.json`; scene length follows
the narration clip + 2 s.
