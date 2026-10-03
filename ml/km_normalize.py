"""Kham Mueang → Central Thai normalisation (spec §6.5). Python twin of
app/src/ml/kmNormalize.ts: longest dictionary match, starting at word boundaries.
Shared test cases: data/km_normalize_cases.json (also run by the app's vitest)."""
from __future__ import annotations

import re

THAI = re.compile(r"[฀-๿]")


def thai_boundaries(text: str) -> list[int]:
    from pythainlp.tokenize import word_tokenize

    b, i = {0, len(text)}, 0
    for tok in word_tokenize(text, engine="newmm", keep_whitespace=True):
        b.add(i)
        i += len(tok)
    return sorted(b)


def normalize_km(text: str, dictionary: dict[str, str], boundaries: list[int] | None = None) -> tuple[str, list[tuple[str, str]]]:
    """Returns (normalized text, tokens) where tokens are (kind, text), kind ∈ km|thai|other."""
    if boundaries is None:
        boundaries = thai_boundaries(text)
    keys = sorted((k for k in dictionary if k), key=len, reverse=True)
    out, toks, i = [], [], 0
    while i < len(text):
        if not THAI.match(text[i]):
            j = i + 1
            while j < len(text) and not THAI.match(text[j]):
                j += 1
            toks.append(("other", text[i:j]))
            out.append(text[i:j])
            i = j
            continue
        key = next((k for k in keys if text.startswith(k, i)), None)
        if key:
            toks.append(("km", key))
            out.append(dictionary[key])
            i += len(key)
            continue
        j = next((x for x in boundaries if x > i), len(text))
        toks.append(("thai", text[i:j]))
        out.append(text[i:j])
        i = j
    return "".join(out), toks


if __name__ == "__main__":
    import json
    from pathlib import Path

    cases = json.loads((Path(__file__).parent / "data" / "km_normalize_cases.json").read_text())
    for c in cases:
        got, _ = normalize_km(c["text"], c["dict"], list(range(len(c["text"]) + 1)))
        assert got == c["expected"], (c, got)
    print(f"{len(cases)} shared cases pass")
