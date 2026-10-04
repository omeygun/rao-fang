# ml/data

| File | Who makes it | Used for | Committed? |
|---|---|---|---|
| `synthetic.jsonl` | `gen_synthetic.py` (Claude teacher) | train + dev (85/15) | yes, once generated |
| `synthetic_stats.json` | `gen_synthetic.py` | teacher agreement rate | yes |
| `cache/` | `gen_synthetic.py` | resume / no double billing | no (gitignored) |
| `human_test.jsonl` | **[MANUAL]** people | test only — never training, never threshold tuning | yes |
| `km_pairs.jsonl` | **[MANUAL]** Noor's family via Teach Mode export | Kham Mueang dictionary + held-out eval | only with their consent |
| `student.json`, `student_dev_report.json` | `train_student.py` | export + dev metrics | yes |
| `km_normalize_cases.json` | hand-written algorithm cases (placeholders + 3 real Kham Mueang cases from the starter list) | JS ↔ Python parity tests | yes |
| `../../app/src/config/km_starter.json` | 38 Kham Mueang words from [sanook.com](https://www.sanook.com/campus/1392241/) | starter suggestions Noor confirms or fixes in Teach (never used unconfirmed) | yes (word list, credited) |

## Writing `human_test.jsonl` [MANUAL]

Copy `human_test.template.jsonl`. One JSON object per line:

```json
{"id": "h-en-001", "text": "...", "lang": "en", "aspects": [{"aspect": "tasting", "sentiment": "positive"}], "is_suggestion": false, "source": "human", "author": "martin-friend-3"}
```

- Write the text yourself (or ask friends), the way a tired tourist would type on a phone. **Do not** paste Claude output, and do not paraphrase synthetic items.
- Aim for ≥ 30 items per language (en, zh, ko) so per-language numbers can be interpreted at all (spec §16.5). Fewer is OK but will be labelled "n < 30: indicative only".
- Label with the schema in `ml/schema.py`. Ideally a second person labels independently and you resolve disagreements.
- Include hard cases: very short, off-topic, sarcastic, mixed, purchase interest, suggestions, code-switching.
- `author` is a pseudonym, never a real name.

## Collecting `km_pairs.jsonl` [MANUAL]

Use Teach Mode on the phone (Word / Sentence swap / Helper), then Settings → ส่งออกข้อมูล and run
`python ml/km_eval.py --from-export raofang-export-YYYY-MM-DD.json`. Or write rows by hand following
`km_pairs.template.jsonl`. Only commit them if the family agrees.
