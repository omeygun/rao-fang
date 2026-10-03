"""Student model: frozen e5 embeddings + logistic-regression heads (spec §5, §8.2).
Shared by train_student.py, export_heads.py and eval.py. The inference + uncertainty
logic mirrors app/src/ml/classify.ts and app/src/ml/uncertainty.ts.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from clauses import split_clauses
from embedder import e5_aspect_input, e5_input
from schema import ASPECTS, SENTIMENTS

DATA = Path(__file__).parent / "data"
STUDENT_PATH = DATA / "student.json"

SCRIPT = {
    "en": re.compile(r"[A-Za-z]"),
    "zh": re.compile(r"[㐀-䶿一-鿿豈-﫿]"),
    "ko": re.compile(r"[ᄀ-ᇿ㄰-㆏가-힯]"),
    "th": re.compile(r"[฀-๿]"),
}
MIN_SCRIPT_SHARE = {"en": 0.5, "zh": 0.2, "ko": 0.2, "th": 0.2}


def word_count(text: str, lang: str) -> int:
    t = text.strip()
    if not t:
        return 0
    if lang == "zh":
        return len(SCRIPT["zh"].findall(t)) + len(re.findall(r"[A-Za-z]+", t))
    if lang == "th":
        from pythainlp.tokenize import word_tokenize

        return sum(1 for w in word_tokenize(t, engine="newmm") if w.strip() and re.search(r"\w", w))
    return len([w for w in re.split(r"\s+", t) if re.search(r"\w", w)])


def script_matches(text: str, lang: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return False
    return len(SCRIPT[lang].findall(text)) / len(letters) >= MIN_SCRIPT_SHARE[lang]


def uncertainty_reasons(text: str, lang: str, probs: np.ndarray, tau_lo: float, tau_hi: float, min_words: int = 3) -> list[str]:
    r = []
    if np.any((probs >= tau_lo) & (probs < tau_hi)):
        r.append("borderline")
    if not np.any(probs >= tau_hi):
        r.append("no_aspect")
    if word_count(text, lang) < min_words:
        r.append("too_short")
    if not script_matches(text, lang):
        r.append("script_mismatch")
    return r


@dataclass
class Student:
    aspect_W: np.ndarray  # (13, 384)
    aspect_b: np.ndarray  # (13,)
    sent_W: np.ndarray  # (3, 384)
    sent_b: np.ndarray  # (3,)
    sug_w: np.ndarray  # (384,)
    sug_b: float
    sentiment_mode: str = "aspect"
    tau_lo: float = 0.35
    tau_hi: float = 0.6
    meta: dict = field(default_factory=dict)

    def aspect_probs(self, X: np.ndarray) -> np.ndarray:
        return 1 / (1 + np.exp(-(X @ self.aspect_W.T + self.aspect_b)))

    def sentiment_probs(self, X: np.ndarray) -> np.ndarray:
        z = X @ self.sent_W.T + self.sent_b
        z -= z.max(axis=1, keepdims=True)
        e = np.exp(z)
        return e / e.sum(axis=1, keepdims=True)

    def suggestion_probs(self, X: np.ndarray) -> np.ndarray:
        return 1 / (1 + np.exp(-(X @ self.sug_w + self.sug_b)))

    def predict(self, rows: list[dict], embedder, tau_lo: float | None = None, tau_hi: float | None = None) -> list[dict]:
        """Full on-device behaviour: aspects ≥ tau_hi, sentiment per aspect, uncertainty flags."""
        lo = self.tau_lo if tau_lo is None else tau_lo
        hi = self.tau_hi if tau_hi is None else tau_hi
        X = embedder.embed([e5_input(r["text"]) for r in rows])
        P = self.aspect_probs(X)
        S = self.suggestion_probs(X)
        out = []
        need = [(i, a) for i in range(len(rows)) for a in range(len(ASPECTS)) if P[i, a] >= hi]
        if need and self.sentiment_mode in ("aspect", "clause", "polarity"):
            src = self.route_clauses(rows, need, embedder) if self.sentiment_mode != "aspect" else {}
            text = lambda i, a: src.get((i, a), rows[i]["text"])
            XS = embedder.embed([e5_input(text(i, a)) if self.sentiment_mode == "polarity" else e5_aspect_input(text(i, a), ASPECTS[a]) for i, a in need])
        else:
            XS = np.stack([X[i] for i, _ in need]) if need else np.zeros((0, X.shape[1]), np.float32)
        SP = self.sentiment_probs(XS) if need else np.zeros((0, 3))
        sent = {(i, a): SENTIMENTS[int(np.argmax(SP[k]))] for k, (i, a) in enumerate(need)}
        for i, r in enumerate(rows):
            reasons = uncertainty_reasons(r["text"], r["lang"], P[i], lo, hi)
            out.append({
                "id": r.get("id"),
                "probs": P[i],
                "aspects": {ASPECTS[a]: sent[(i, a)] for a in range(len(ASPECTS)) if P[i, a] >= hi},
                "is_suggestion": bool(S[i] >= hi),
                "unsure": bool(reasons),
                "reasons": reasons,
            })
        return out

    def route_clauses(self, rows: list[dict], need: list[tuple[int, int]], embedder) -> dict:
        """(item, aspect) -> the clause whose aspect probability is highest (multi-clause items only)."""
        parts = {i: split_clauses(rows[i]["text"]) for i, _ in need}
        flat = [(i, c) for i, cs in parts.items() if len(cs) > 1 for c in cs]
        if not flat:
            return {}
        P = self.aspect_probs(embedder.embed([e5_input(c) for _, c in flat]))
        out = {}
        for i, a in need:
            ks = [k for k, (j, _) in enumerate(flat) if j == i]
            if ks:
                out[(i, a)] = flat[max(ks, key=lambda k: P[k, a])][1]
        return out

    def save(self, path: Path = STUDENT_PATH):
        path.write_text(json.dumps({
            "aspect_W": self.aspect_W.tolist(), "aspect_b": self.aspect_b.tolist(),
            "sent_W": self.sent_W.tolist(), "sent_b": self.sent_b.tolist(),
            "sug_w": self.sug_w.tolist(), "sug_b": float(self.sug_b),
            "sentiment_mode": self.sentiment_mode, "tau_lo": self.tau_lo, "tau_hi": self.tau_hi, "meta": self.meta,
        }))

    @classmethod
    def load(cls, path: Path = STUDENT_PATH) -> "Student":
        j = json.loads(path.read_text())
        return cls(
            np.array(j["aspect_W"], np.float32), np.array(j["aspect_b"], np.float32),
            np.array(j["sent_W"], np.float32), np.array(j["sent_b"], np.float32),
            np.array(j["sug_w"], np.float32), float(j["sug_b"]),
            j["sentiment_mode"], j["tau_lo"], j["tau_hi"], j["meta"],
        )


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(l) for l in Path(path).read_text().splitlines() if l.strip()]
