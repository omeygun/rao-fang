"""Optional (P2, spec §8.5): NLLB-200-distilled-600M en/zh/ko → th on a FLORES-200 devtest
subsample, chrF with n per language (spec §16.5). CPU only; can run overnight.

Note: this evaluates the original PyTorch fp32 checkpoint (facebook/nllb-200-distilled-600M),
not the q8 ONNX export the app downloads; quantisation can change quality. Say so when quoting.

  python flores_eval.py --n 200 --out ../docs/flores_eval.md
"""
from __future__ import annotations

import argparse
import random
import time
from pathlib import Path

SRC = {"en": "eng_Latn", "zh": "zho_Hans", "ko": "kor_Hang"}
TGT = "tha_Thai"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=200)
    ap.add_argument("--seed", type=int, default=13)
    ap.add_argument("--model", default="facebook/nllb-200-distilled-600M")
    ap.add_argument("--dataset", default="openlanguagedata/flores_plus", help="HF dataset id holding FLORES-200 devtest")
    ap.add_argument("--out", default=str(Path(__file__).parent.parent / "docs" / "flores_eval.md"))
    args = ap.parse_args()
    import sacrebleu
    from datasets import load_dataset
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    tok = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForSeq2SeqLM.from_pretrained(args.model)

    def load(code):
        ds = load_dataset(args.dataset, code, split="devtest")
        return {r["id"]: r["text"] for r in ds}

    tgt = load(TGT)
    ids = sorted(tgt)
    random.Random(args.seed).shuffle(ids)
    ids = ids[: args.n]
    L = [f"# NLLB → Thai on FLORES-200 devtest subsample\n", f"{time.strftime('%Y-%m-%d')} · model `{args.model}` (fp32 PyTorch, not the app's q8 ONNX) · "
         f"seeded subsample of {len(ids)} sentences · chrF via sacrebleu.\n", "| Source | n | chrF |", "|---|---|---|"]
    for lang, code in SRC.items():
        src = load(code)
        tok.src_lang = code
        hyps = []
        for i in ids:
            enc = tok(src[i], return_tensors="pt")
            out = model.generate(**enc, forced_bos_token_id=tok.convert_tokens_to_ids(TGT), max_new_tokens=256)
            hyps.append(tok.batch_decode(out, skip_special_tokens=True)[0])
        score = sacrebleu.corpus_chrf(hyps, [[tgt[i] for i in ids]]).score
        n = len(ids)
        L.append(f"| {lang} | {n}{' (n < 30: indicative only)' if n < 30 else ''} | {score:.1f} |")
        print(lang, n, score)
    L.append("\nFLORES is formal Wikipedia-style text, not tourist feedback; it does not measure quality on short, informal reviews.")
    Path(args.out).write_text("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
