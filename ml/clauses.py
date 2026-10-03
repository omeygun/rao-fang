"""Split feedback into clauses at sentence ends and contrast words, so each aspect's sentiment
is judged on the clause that talks about it ("I hated the coffee, but the walk was fun").
Python twin of app/src/ml/clauses.ts; keep the two in sync (shared cases: data/clause_cases.json)."""
import re

# Sentence ends, then contrast connectives (kept with the clause that follows them).
_SENT = re.compile(r"(?<=[.!?。！？\n])\s*")
_CONTRAST = re.compile(
    r"\s*,?\s*\b(?=(?:but|however|although|though|whereas)\b)"   # en
    r"|(?=但是|可是|不过|然而|但)"                                  # zh
    r"|(?<=지만)\s*|\s*(?=하지만|그런데|그러나)"                     # ko (-지만 suffix ends a clause)
    r"|\s*(?=แต่)",                                                # th
    re.IGNORECASE,
)


# Leading contrast word of a clause ("But, walking was fun" -> "walking was fun"): it signals the
# contrast, not the clause's own sentiment, and in training it co-occurs mostly with "mixed".
_LEAD = re.compile(r"^(?:(?:but|however|although|though|whereas)\b[\s,]*|但是|可是|不过|然而|但|하지만\s*|그런데\s*|그러나\s*|แต่ว่า|แต่)", re.IGNORECASE)


def split_clauses(text: str) -> list[str]:
    out = []
    for sent in _SENT.split(text.strip()):
        out += [_LEAD.sub("", c.strip(" ,，、")).strip(" ,，、") for c in _CONTRAST.split(sent)]
    return [c for c in out if len(c) >= 2] or [text.strip()]


if __name__ == "__main__":
    import json
    from pathlib import Path

    for c in json.loads((Path(__file__).parent / "data" / "clause_cases.json").read_text()):
        assert split_clauses(c["text"]) == c["clauses"], (c, split_clauses(c["text"]))
    print("clause cases pass")
