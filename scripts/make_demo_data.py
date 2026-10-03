"""Sample data for the app's "Try the demo" button → app/public/demo/demo.json.

Texts are held-out synthetic dev items (Claude-written, never trained on). Aspect/sentiment outputs are the
shipped student's real predictions on them (not hand-picked labels), so the demo shows real model behaviour,
including "not sure" items. The app marks everything as sample data and can delete it in one tap.
Photo ratings are generated deterministically to match each item's text sentiment.
"""
import json, random, sys
from pathlib import Path
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "ml"))
from embedder import E5Embedder, e5_input  # noqa: E402
from schema import ASPECTS  # noqa: E402
from student import Student, load_jsonl, DATA  # noqa: E402

TOUR = {"walk_trail": "walk", "coffee_picking": "picking", "processing_roasting": "processing", "tasting": "tasting", "host_hospitality": "host"}
rows = load_jsonl(DATA / "synthetic.jsonl") + load_jsonl(DATA / "synthetic_balanced.jsonl")
_, dev = train_test_split(rows, test_size=0.15, random_state=13, stratify=[r["lang"] for r in rows])
rng = random.Random(7)
st, emb = Student.load(), E5Embedder()
heads = json.loads((ROOT / "app/public/models/heads.json").read_text())

guest = [r for r in dev if r["lang"] in ("en", "zh", "ko") and 6 <= len(r["text"]) <= 160]
preds = st.predict(guest, emb)
sure = [(r, p) for r, p in zip(guest, preds) if not p["unsure"]]
unsure = [(r, p) for r, p in zip(guest, preds) if p["unsure"]]
# Cover many aspects: greedily pick items that add an unseen aspect, then fill.
picked, seen = [], set()
for r, p in sorted(sure, key=lambda x: rng.random()):
    if set(p["aspects"]) - seen and len(picked) < 12:
        picked.append((r, p)); seen |= set(p["aspects"])
picked += unsure[:2]

visits = []
for k, (r, p) in enumerate(picked):
    ratings = []
    for a, step in TOUR.items():
        s = p["aspects"].get(a)
        if s in ("positive", "negative"):
            ratings.append({"stepId": step, "aspect": a, "value": "up" if s == "positive" else "down"})
        elif rng.random() < 0.6:
            ratings.append({"stepId": step, "aspect": a, "value": "up" if rng.random() < 0.75 else "down"})
    probs = p["probs"]
    # The student's real outputs, stored the way the app stores them: every aspect >= tau_lo, highest first.
    asp = [{"aspect": ASPECTS[i], "p": round(float(probs[i]), 3), **({"sentiment": p["aspects"][ASPECTS[i]]} if ASPECTS[i] in p["aspects"] else {})}
           for i in sorted(range(len(ASPECTS)), key=lambda i: -probs[i]) if probs[i] >= st.tau_lo]
    sug = float(st.suggestion_probs(emb.embed([e5_input(r["text"])]))[0])
    visits.append({
        "daysAgo": [0, 1, 1, 2, 3, 4, 5, 6, 9, 12, 16, 20, 2, 5][k % 14],
        "lang": r["lang"], "text": r["text"], "sourceId": r["id"], "ratings": ratings,
        "model": {"aspects": asp, "suggestionP": round(sug, 3), "headsVersion": heads["version"]},
        "unsure": p["unsure"], "unsureReasons": p["reasons"],
    })

out = ROOT / "app/public/demo/demo.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({"note": __doc__.strip().splitlines()[0], "headsVersion": heads["version"], "visits": visits}, ensure_ascii=False, indent=1))
print(f"wrote {out} with {len(visits)} visits ({sum(v['unsure'] for v in visits)} not-sure); aspects covered: {sorted(seen)}")
