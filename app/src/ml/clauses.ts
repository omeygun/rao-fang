// Split feedback into clauses at sentence ends and contrast words so each aspect's sentiment is
// judged on the clause that talks about it. Mirror of ml/clauses.py (shared cases: ml/data/clause_cases.json).
const SENT = /(?<=[.!?。！？\n])\s*/;
const CONTRAST = new RegExp(
  [
    String.raw`\s*,?\s*\b(?=(?:but|however|although|though|whereas)\b)`, // en
    '(?=但是|可是|不过|然而|但)', // zh
    String.raw`(?<=지만)\s*|\s*(?=하지만|그런데|그러나)`, // ko (-지만 suffix ends a clause)
    String.raw`\s*(?=แต่)`, // th
  ].join('|'),
  'i',
);

const trim = (s: string) => s.replace(/^[\s,，、]+|[\s,，、]+$/g, '');

export function splitClauses(text: string): string[] {
  const out = text.trim().split(SENT).flatMap((s) => s.split(CONTRAST).map(trim));
  const kept = out.filter((c) => c.length >= 2);
  return kept.length ? kept : [text.trim()];
}
