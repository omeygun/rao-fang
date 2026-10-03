"""Train the student (spec §8.2): frozen multilingual-e5-small + sklearn logistic regression.

  python train_student.py                 # trains on data/synthetic.jsonl, writes data/student.json,
                                          # data/student_dev_report.json, app/public/models/parity.json
  python train_student.py --fake-embedder # pipeline smoke test only; writes to data/_fake/, never exported

Thresholds tau_lo / tau_hi are tuned on the 15% synthetic dev split: the largest coverage
whose precision-when-sure ≥ --target-precision (else the most precise setting).
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

from embedder import ENCODER, PREFIX, e5_aspect_input, e5_input, get_embedder
from metrics import aspect_majority, aspect_scores, counter_prior_accuracy, coverage_precision, sentiment_accuracy
from schema import ASPECTS, SENTIMENTS
from student import DATA, STUDENT_PATH, Student, load_jsonl

APP_MODELS = Path(__file__).parent.parent / "app" / "public" / "models"
PARITY_SENTENCES = [
    "The coffee tasting was the highlight of our trip!",
    "走山路有点累，但是风景很美。",
    "커피 원두를 사고 싶어요. 어디서 살 수 있나요?",
    "กาแฟอร่อยมาก แต่ทางเดินชันไปหน่อย",
    "Too long, and the price was a bit high for what we got.",
]


def fit_binary(X: np.ndarray, y: np.ndarray, C: float, name: str) -> tuple[np.ndarray, float]:
    if y.sum() == 0 or y.sum() == len(y):
        print(f"  ! {name}: only one class in training data ({int(y.sum())}/{len(y)} positive); using a constant head")
        return np.zeros(X.shape[1], np.float32), (-10.0 if y.sum() == 0 else 10.0)
    m = LogisticRegression(class_weight="balanced", C=C, max_iter=3000)
    m.fit(X, y)
    return m.coef_[0].astype(np.float32), float(m.intercept_[0])


def tune_thresholds(student: Student, dev: list[dict], embedder, target: float) -> tuple[float, float, list[dict]]:
    grid = []
    for hi in np.arange(0.40, 0.951, 0.05):
        for lo in np.arange(0.10, hi - 0.049, 0.05):
            preds = student.predict(dev, embedder, tau_lo=float(lo), tau_hi=float(hi))
            cp = coverage_precision(dev, preds)
            grid.append({"tau_lo": round(float(lo), 2), "tau_hi": round(float(hi), 2), **{k: cp[k] for k in ("coverage", "precision_when_sure", "n_covered")}})
    ok = [g for g in grid if g["precision_when_sure"] is not None and g["precision_when_sure"] >= target]
    best = max(ok, key=lambda g: (g["coverage"], g["precision_when_sure"])) if ok else max(
        (g for g in grid if g["precision_when_sure"] is not None), key=lambda g: g["precision_when_sure"])
    return best["tau_lo"], best["tau_hi"], grid


def contrastive(golds: list[dict], preds: list[dict]) -> tuple[list, list]:
    """Items whose aspects carry different sentiments ("coffee bad, walk fun")."""
    keep = [k for k, g in enumerate(golds) if len({a["sentiment"] for a in g["aspects"]}) > 1]
    return [golds[k] for k in keep], [preds[k] for k in keep]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", nargs="+", default=[str(p) for p in (DATA / "synthetic.jsonl", DATA / "synthetic_balanced.jsonl") if p.exists()])
    ap.add_argument("--C", type=float, default=1.0)
    ap.add_argument("--sentiment-mode", choices=["aspect", "clause", "polarity", "item"], default="aspect",
                    help="aspect: head on 'query: {text} [aspect: {a}]' (spec); clause: same head on the clause that mentions "
                         "the aspect; polarity: untagged head on that clause; item: one item-level head (simplification)")
    ap.add_argument("--target-precision", type=float, default=0.85)
    ap.add_argument("--seed", type=int, default=13)
    ap.add_argument("--fake-embedder", action="store_true", help="smoke test without model download; outputs are meaningless")
    args = ap.parse_args()
    t0 = time.time()

    rows = [r for d in args.data for r in load_jsonl(Path(d))]
    rows = [r for r in rows if r.get("source") != "human"]  # never train on human data
    train, dev = train_test_split(rows, test_size=0.15, random_state=args.seed, stratify=[r["lang"] for r in rows])
    print(f"train {len(train)} / dev {len(dev)}")
    emb = get_embedder(args.fake_embedder)

    Xtr = emb.embed([e5_input(r["text"]) for r in train])
    W, b = [], []
    for a in ASPECTS:
        y = np.array([any(x["aspect"] == a for x in r["aspects"]) for r in train], int)
        w, bb = fit_binary(Xtr, y, args.C, a)
        W.append(w)
        b.append(bb)
    sug_w, sug_b = fit_binary(Xtr, np.array([r["is_suggestion"] for r in train], int), args.C, "is_suggestion")

    # Sentiment head.
    if args.sentiment_mode == "polarity":
        # Untagged polarity head: whole text for single-sentiment items; for items whose aspects disagree,
        # the clause each aspect is routed to (clauses.py), so the head learns from words, not aspect priors.
        router = Student(np.stack(W), np.array(b, np.float32), np.zeros((3, Xtr.shape[1]), np.float32), np.zeros(3, np.float32), sug_w, sug_b)
        texts, ys = [], []
        for r in train:
            sents = {x["sentiment"] for x in r["aspects"]}
            if len(sents) == 1:
                texts.append(r["text"]); ys.append(SENTIMENTS.index(sents.pop()))
            elif len(sents) > 1:
                need = [(0, ASPECTS.index(x["aspect"])) for x in r["aspects"]]
                src = router.route_clauses([r], need, emb)
                for x, key in zip(r["aspects"], need):
                    if key in src:
                        texts.append(src[key]); ys.append(SENTIMENTS.index(x["sentiment"]))
        Xs = emb.embed([e5_input(t) for t in texts])
        ys = np.array(ys)
        print(f"  polarity head: {len(texts)} rows ({sum(t not in {r['text'] for r in train} for t in texts)} from clauses)")
    elif args.sentiment_mode in ("aspect", "clause"):
        pairs = [(r["text"], x["aspect"], x["sentiment"]) for r in train for x in r["aspects"]]
        Xs = emb.embed([e5_aspect_input(t, a) for t, a, _ in pairs])
        ys = np.array([SENTIMENTS.index(s) for _, _, s in pairs])
    else:  # item-level: majority sentiment of the item's aspects
        items = [(i, r) for i, r in enumerate(train) if r["aspects"]]
        Xs = Xtr[[i for i, _ in items]]
        ys = np.array([SENTIMENTS.index(max(SENTIMENTS, key=[x["sentiment"] for x in r["aspects"]].count)) for _, r in items])
    present = sorted(set(ys.tolist()))
    sm = LogisticRegression(class_weight="balanced", C=args.C, max_iter=3000)
    sm.fit(Xs, ys)
    sW = np.zeros((3, Xs.shape[1]), np.float32)
    sb = np.full(3, -30.0, np.float32)  # classes absent from training get ~0 probability
    if len(present) == 2:  # sklearn returns a single row for binary problems
        sW[present[1]], sb[present[1]] = sm.coef_[0], sm.intercept_[0]
        sW[present[0]], sb[present[0]] = 0.0, 0.0
    else:
        for k, c in enumerate(sm.classes_):
            sW[c], sb[c] = sm.coef_[k], sm.intercept_[k]

    student = Student(np.stack(W), np.array(b, np.float32), sW, sb, sug_w, sug_b, args.sentiment_mode,
                      meta={"encoder": ENCODER, "prefix": PREFIX, "C": args.C, "n_train": len(train), "n_dev": len(dev),
                            "fake_embedder": emb.fake, "data": "+".join(Path(d).name for d in args.data), "seed": args.seed})
    lo, hi, grid = tune_thresholds(student, dev, emb, args.target_precision)
    student.tau_lo, student.tau_hi = lo, hi
    print(f"tuned on dev: tau_lo={lo} tau_hi={hi}")

    preds = student.predict(dev, emb)
    majority = aspect_majority(train)
    report = {"thresholds": {"tau_lo": lo, "tau_hi": hi, "target_precision": args.target_precision}, "overall": {}, "per_lang": {}, "grid": grid}
    groups = {"overall": list(range(len(dev)))} | {l: [i for i, r in enumerate(dev) if r["lang"] == l] for l in sorted({r["lang"] for r in dev})}
    for name, idx in groups.items():
        g, p = [dev[i] for i in idx], [preds[i] for i in idx]
        block = {"aspects": aspect_scores(g, p), "sentiment": sentiment_accuracy(g, p), "coverage": coverage_precision(g, p),
                 "sentiment_counter_prior": counter_prior_accuracy(g, p, majority),
                 "sentiment_contrastive": sentiment_accuracy(*contrastive(g, p))}
        if name == "overall":
            report["overall"] = block
        else:
            report["per_lang"][name] = block
    report["meta"] = student.meta | {"runtime_s": round(time.time() - t0, 1)}

    out_dir = DATA / "_fake" if emb.fake else DATA
    out_dir.mkdir(exist_ok=True)
    student.save(out_dir / STUDENT_PATH.name)
    (out_dir / "student_dev_report.json").write_text(json.dumps(report, indent=1, ensure_ascii=False, default=float))
    print(f"wrote {out_dir / STUDENT_PATH.name}, dev micro-F1 {report['overall']['aspects']['micro_f1']}, "
          f"coverage {report['overall']['coverage']['coverage']}, precision-when-sure {report['overall']['coverage']['precision_when_sure']}")

    if not emb.fake:
        APP_MODELS.mkdir(parents=True, exist_ok=True)
        inputs = [e5_input(s) for s in PARITY_SENTENCES]
        (APP_MODELS / "parity.json").write_text(json.dumps({
            "encoder": ENCODER, "prefix": PREFIX, "sentences": PARITY_SENTENCES, "inputs": inputs,
            "embeddings": emb.embed(inputs).round(6).tolist(),
        }, ensure_ascii=False))
        print("wrote app/public/models/parity.json — open #/dev/parity on the phone to check cosine > 0.99")
    print(f"done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
