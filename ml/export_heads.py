"""Export the trained student to app/public/models/heads.json (format: rao-fang-heads/1,
read by app/src/ml/heads.ts). Refuses to export a student trained with the fake embedder."""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from schema import ASPECTS, SENTIMENTS
from student import STUDENT_PATH, Student

OUT = Path(__file__).parent.parent / "app" / "public" / "models" / "heads.json"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--student", default=str(STUDENT_PATH))
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()
    s = Student.load(Path(args.student))
    if s.meta.get("fake_embedder"):
        sys.exit("refusing to export: this student was trained with --fake-embedder")
    r6 = lambda v: [round(float(x), 6) for x in v]
    heads = {
        "format": "rao-fang-heads/1",
        "version": time.strftime("%Y%m%d-%H%M") + f"-n{s.meta.get('n_train')}",
        "encoder": "Xenova/multilingual-e5-small",
        "trainedEncoder": s.meta.get("encoder"),
        "prefix": s.meta.get("prefix", "query: "),
        "pooling": "mean",
        "normalize": True,
        "dim": int(s.aspect_W.shape[1]),
        "aspects": {a: {"w": r6(s.aspect_W[i]), "b": round(float(s.aspect_b[i]), 6)} for i, a in enumerate(ASPECTS)},
        "sentimentMode": s.sentiment_mode,
        "sentiment": {"classes": SENTIMENTS, "W": [r6(row) for row in s.sent_W], "b": r6(s.sent_b)},
        "suggestion": {"w": r6(s.sug_w), "b": round(float(s.sug_b), 6)},
        "thresholds": {"tauHi": s.tau_hi, "tauLo": s.tau_lo, "tunedOn": "synthetic dev split (15%)"},
        "trainedOn": s.meta.get("data"),
    }
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(heads, separators=(",", ":")))
    print(f"wrote {args.out} ({Path(args.out).stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
