"""Metric helpers shared by train_student.py and eval.py. Every metric carries its n."""
from __future__ import annotations

from collections import Counter

from schema import ASPECTS

SMALL_N = 30
SMALL_N_LABEL = "n < 30: indicative only"


def gold_aspects(r: dict) -> dict:
    return {a["aspect"]: a["sentiment"] for a in r["aspects"]}


def prf(tp: int, fp: int, fn: int) -> tuple[float | None, float | None, float | None]:
    p = tp / (tp + fp) if tp + fp else None
    r = tp / (tp + fn) if tp + fn else None
    f = 2 * p * r / (p + r) if p and r else (0.0 if p is not None and r is not None else None)
    return p, r, f


def aspect_scores(golds: list[dict], preds: list[dict]) -> dict:
    """Micro/macro F1 over aspects using predicted aspects (≥ tau_hi), ignoring the unsure flag."""
    per = {a: [0, 0, 0] for a in ASPECTS}
    for g, p in zip(golds, preds):
        gs, ps = set(gold_aspects(g)), set(p["aspects"])
        for a in ASPECTS:
            if a in ps and a in gs:
                per[a][0] += 1
            elif a in ps:
                per[a][1] += 1
            elif a in gs:
                per[a][2] += 1
    tp, fp, fn = (sum(v[i] for v in per.values()) for i in range(3))
    micro = prf(tp, fp, fn)
    f1s = [prf(*v)[2] for a, v in per.items() if v[0] + v[2] > 0]  # aspects present in gold
    macro = sum(f for f in f1s if f is not None) / len(f1s) if f1s else None
    return {"n": len(golds), "micro_p": micro[0], "micro_r": micro[1], "micro_f1": micro[2], "macro_f1": macro,
            "per_aspect": {a: {"support": v[0] + v[2], "f1": prf(*v)[2]} for a, v in per.items()}}


def sentiment_accuracy(golds: list[dict], preds: list[dict]) -> dict:
    """Accuracy over (item, aspect) pairs where both gold and prediction contain the aspect."""
    n = ok = 0
    for g, p in zip(golds, preds):
        ga = gold_aspects(g)
        for a, s in p["aspects"].items():
            if a in ga:
                n += 1
                ok += s == ga[a]
    return {"n_pairs": n, "accuracy": ok / n if n else None}


def coverage_precision(golds: list[dict], preds: list[dict]) -> dict:
    """How often the tool says "not sure", and how right it is when it doesn't."""
    covered = [(g, p) for g, p in zip(golds, preds) if not p["unsure"]]
    tp = fp = exact = 0
    for g, p in covered:
        gs, ps = set(gold_aspects(g)), set(p["aspects"])
        tp += len(gs & ps)
        fp += len(ps - gs)
        exact += gs == ps
    return {
        "n": len(golds), "n_covered": len(covered),
        "coverage": len(covered) / len(golds) if golds else None,
        "precision_when_sure": tp / (tp + fp) if tp + fp else None,
        "exact_match_when_sure": exact / len(covered) if covered else None,
        "unsure_reasons": dict(Counter(r for p in preds for r in p["reasons"])),
    }


def top_errors(golds: list[dict], preds: list[dict], k: int = 8) -> list[tuple[str, int]]:
    c = Counter()
    for g, p in zip(golds, preds):
        ga, pa = gold_aspects(g), p["aspects"]
        for a in set(pa) - set(ga):
            c[f"false positive: {a}"] += 1
        for a in set(ga) - set(pa):
            c[f"missed: {a}"] += 1
        for a in set(ga) & set(pa):
            if ga[a] != pa[a]:
                c[f"sentiment {ga[a]}→{pa[a]} on {a}"] += 1
    return c.most_common(k)


def fmt(x, nd=3):
    return "—" if x is None else f"{x:.{nd}f}"


def n_label(n: int) -> str:
    return f"{n} ({SMALL_N_LABEL})" if n < SMALL_N else str(n)
