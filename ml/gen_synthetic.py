"""Teacher: Claude generates labeled visitor feedback (spec §8.1).

Two steps per batch, in separate API calls, to reduce label leakage:
  1. generate texts + labels from a varied "slot" description;
  2. re-label the texts blind (no access to step-1 labels).
Items whose two label sets disagree are dropped; the agreement rate is logged.

Every API response is cached under data/cache/ keyed by a hash of the request,
so re-running resumes where it stopped and never pays twice for the same call.

Usage:
  export ANTHROPIC_API_KEY=...
  export ANTHROPIC_WORKSPACE_ID=...   # only if the key is not scoped to a workspace
  python gen_synthetic.py --model <model-id> [--effort low] [--workers 4]
The model id is a required flag on purpose: pick it yourself, nothing is assumed.

[MANUAL] Before using these outputs to train a model, check Anthropic's usage
terms on using outputs to train models and record the result in docs/datasets.md.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import anthropic

from schema import ASPECT_DESCRIPTIONS, ASPECTS, LANGS, SENTIMENTS, validate_row

PROMPT_VERSION = "gen-v1"
DATA = Path(__file__).parent / "data"
CACHE = DATA / "cache"

LANG_NAMES = {"en": "English", "zh": "Simplified Chinese (Mandarin)", "ko": "Korean", "th": "Thai (Central Thai)"}
VISITOR = {
    "en": "a foreign tourist who writes in English (could be a native or non-native speaker)",
    "zh": "a tourist from mainland China, Taiwan, Singapore or Malaysia writing in Simplified Chinese",
    "ko": "a Korean tourist writing in Korean",
    "th": "a Thai domestic tourist from Bangkok writing in Thai",
}
LENGTHS = ["very short (3-8 words)", "short (8-20 words)", "medium (20-45 words)", "long (45-80 words)"]
TONES = ["enthusiastic", "polite and reserved", "blunt", "casual chat style", "tired and a bit grumpy", "formal", "playful with emoji"]
TWISTS = [
    "contains one or two typos or informal spellings",
    "mentions two or three different aspects with different sentiments",
    "has mixed feelings about a single aspect",
    "is a concrete suggestion for improvement",
    "expresses interest in buying coffee beans or other products",
    "is sarcastic (literal words positive, meaning negative, or vice versa)",
    "is neutral or vague without a clear topic",
    "is off-topic (about the weather, their trip in general, etc.)",
    "is a plain positive or negative comment about one aspect",
    "asks a question to the host",
]

ASPECT_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {"aspect": {"type": "string", "enum": ASPECTS}, "sentiment": {"type": "string", "enum": SENTIMENTS}},
        "required": ["aspect", "sentiment"],
        "additionalProperties": False,
    },
}
GEN_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"text": {"type": "string"}, "aspects": ASPECT_SCHEMA, "is_suggestion": {"type": "boolean"}},
                "required": ["text", "aspects", "is_suggestion"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["items"],
    "additionalProperties": False,
}
LABEL_SCHEMA = {
    "type": "object",
    "properties": {
        "labels": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"id": {"type": "string"}, "aspects": ASPECT_SCHEMA, "is_suggestion": {"type": "boolean"}},
                "required": ["id", "aspects", "is_suggestion"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["labels"],
    "additionalProperties": False,
}

SCHEMA_TEXT = "\n".join(f"- {a}: {d}" for a, d in ASPECT_DESCRIPTIONS.items())
LABEL_RULES = f"""Label schema (multi-label):
Aspects:
{SCHEMA_TEXT}
For each aspect actually mentioned, give sentiment: positive, negative, or mixed.
An item can mention zero aspects (e.g. vague or off-topic) — then "aspects" is [].
Use "other" only for relevant tour feedback that fits no other aspect.
purchase_interest: sentiment is positive if they want to buy, negative if they explicitly don't want to / found products disappointing, mixed if unsure.
is_suggestion: true only if the item proposes a concrete change or improvement."""


def slots(lang: str, n_items: int, batch: int, rng: random.Random) -> list[dict]:
    out = []
    for i in range(0, n_items, batch):
        k = min(batch, n_items - i)
        out.append({
            "lang": lang,
            "slot": i // batch,
            "k": k,
            "specs": [
                {"length": rng.choice(LENGTHS), "tone": rng.choice(TONES), "twist": rng.choice(TWISTS)}
                for _ in range(k)
            ],
        })
    return out


def gen_prompt(s: dict) -> str:
    lines = "\n".join(f"{j+1}. length: {sp['length']}; tone: {sp['tone']}; this item {sp['twist']}." for j, sp in enumerate(s["specs"]))
    return f"""You are helping build a test-and-training set for a small on-device classifier.

Context: a smallholder coffee farmer in the northern Thai highlands runs informal farm tours
(walk through the farm, picking coffee cherries, processing and roasting, coffee tasting,
home-cooked food, hospitality). Visitors leave short feedback on a phone at the end of the tour.

Write {s['k']} realistic, independent feedback items as {VISITOR[s['lang']]}, in {LANG_NAMES[s['lang']]} only.
Each item must follow its own spec:
{lines}

Make items varied and natural — like real people typing quickly on a phone, not marketing copy.
Do not invent names of real people or businesses.

{LABEL_RULES}

Return JSON with one entry per item, in order."""


def label_prompt(items: list[dict]) -> str:
    listing = "\n".join(json.dumps({"id": it["id"], "text": it["text"]}, ensure_ascii=False) for it in items)
    return f"""Label each visitor feedback item from a small coffee-farm tour in northern Thailand.

{LABEL_RULES}

Items (one JSON object per line):
{listing}

Return JSON with one label entry per item id."""


class Teacher:
    def __init__(self, model: str, effort: str | None):
        # Keys that are not scoped to a workspace need the workspace id on every request.
        ws = os.environ.get("ANTHROPIC_WORKSPACE_ID")
        self.client = anthropic.Anthropic(max_retries=6, default_headers={"anthropic-workspace-id": ws} if ws else None)
        self.model = model
        self.effort = effort
        CACHE.mkdir(parents=True, exist_ok=True)

    def call(self, prompt: str, schema: dict) -> dict:
        output_config: dict = {"format": {"type": "json_schema", "schema": schema}}
        if self.effort:
            output_config["effort"] = self.effort
        req = {"model": self.model, "max_tokens": 16000, "messages": [{"role": "user", "content": prompt}], "output_config": output_config}
        key = hashlib.sha256(json.dumps(req, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:24]
        path = CACHE / f"{key}.json"
        if path.exists():
            return json.loads(path.read_text())
        resp = self.client.messages.create(**req)
        if resp.stop_reason == "refusal":
            raise RuntimeError(f"refusal: {resp.stop_details}")
        if resp.stop_reason == "max_tokens":
            raise RuntimeError("hit max_tokens; reduce --batch")
        text = next(b.text for b in resp.content if b.type == "text")
        data = json.loads(text)
        path.write_text(json.dumps(data, ensure_ascii=False))
        return data


def norm_labels(aspects: list[dict]) -> dict:
    return {a["aspect"]: a["sentiment"] for a in aspects}


def run_slot(teacher: Teacher, s: dict) -> tuple[list[dict], dict]:
    gen = teacher.call(gen_prompt(s), GEN_SCHEMA)["items"]
    items = []
    for j, g in enumerate(gen):
        items.append({
            "id": f"syn-{s['lang']}-{s['slot']:04d}-{j:02d}",
            "text": g["text"].strip(),
            "lang": s["lang"],
            "gen_aspects": g["aspects"],
            "gen_is_suggestion": g["is_suggestion"],
            "spec": s["specs"][j] if j < len(s["specs"]) else None,
        })
    relabels = {r["id"]: r for r in teacher.call(label_prompt(items), LABEL_SCHEMA)["labels"]}
    kept, st = [], {"generated": len(items), "relabeled": 0, "aspect_set_agree": 0, "full_agree": 0}
    for it in items:
        r = relabels.get(it["id"])
        if not r:
            continue
        st["relabeled"] += 1
        a1, a2 = norm_labels(it["gen_aspects"]), norm_labels(r["aspects"])
        if set(a1) == set(a2):
            st["aspect_set_agree"] += 1
        if a1 == a2 and it["gen_is_suggestion"] == r["is_suggestion"]:
            st["full_agree"] += 1
            row = {
                "id": it["id"], "text": it["text"], "lang": it["lang"],
                "aspects": [{"aspect": a, "sentiment": a2[a]} for a in ASPECTS if a in a2],
                "is_suggestion": r["is_suggestion"],
                "source": "synthetic-claude", "prompt_version": PROMPT_VERSION,
                "teacher_model": teacher.model, "spec": it["spec"],
            }
            if not validate_row(row):
                kept.append(row)
    return kept, st


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--model", required=True, help="Claude model id for the teacher (required; nothing is assumed)")
    ap.add_argument("--effort", default=None, help="optional output_config.effort, e.g. low (only on models that support it)")
    ap.add_argument("--per-lang", default="en=450,zh=450,ko=450,th=150", help="items to generate per language")
    ap.add_argument("--batch", type=int, default=10, help="items per generation call")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--seed", type=int, default=13)
    ap.add_argument("--out", default=str(DATA / "synthetic.jsonl"))
    args = ap.parse_args()

    counts = {k: int(v) for k, v in (p.split("=") for p in args.per_lang.split(","))}
    assert set(counts) <= set(LANGS), counts
    rng = random.Random(args.seed)
    all_slots = [s for lang, n in counts.items() for s in slots(lang, n, args.batch, rng)]
    teacher = Teacher(args.model, args.effort)

    rows, stats, failed = [], {}, 0
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(run_slot, teacher, s): s for s in all_slots}
        for i, f in enumerate(as_completed(futs), 1):
            s = futs[f]
            try:
                kept, st = f.result()
            except anthropic.APIConnectionError as e:
                failed += 1
                print(f"[slot {s['lang']}/{s['slot']}] connection error: {e}; re-run to resume", file=sys.stderr)
                continue
            except (anthropic.APIStatusError, RuntimeError, json.JSONDecodeError) as e:
                failed += 1
                print(f"[slot {s['lang']}/{s['slot']}] failed: {e}; re-run to resume", file=sys.stderr)
                continue
            rows += kept
            agg = stats.setdefault(s["lang"], {"generated": 0, "relabeled": 0, "aspect_set_agree": 0, "full_agree": 0})
            for k, v in st.items():
                agg[k] += v
            if i % 10 == 0:
                print(f"{i}/{len(all_slots)} batches done, {len(rows)} rows kept")

    rows.sort(key=lambda r: r["id"])
    Path(args.out).write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))
    tot = {k: sum(s[k] for s in stats.values()) for k in ("generated", "relabeled", "aspect_set_agree", "full_agree")}
    report = {
        "teacher_model": args.model, "prompt_version": PROMPT_VERSION, "failed_batches": failed,
        "per_lang": stats, "total": tot,
        "full_agreement_rate": tot["full_agree"] / tot["relabeled"] if tot["relabeled"] else None,
        "aspect_set_agreement_rate": tot["aspect_set_agree"] / tot["relabeled"] if tot["relabeled"] else None,
        "kept": len(rows),
    }
    (DATA / "synthetic_stats.json").write_text(json.dumps(report, indent=1, ensure_ascii=False))
    print(json.dumps(report, indent=1, ensure_ascii=False))
    if failed:
        print(f"{failed} batches failed — re-run the same command to resume from cache.", file=sys.stderr)


if __name__ == "__main__":
    main()
