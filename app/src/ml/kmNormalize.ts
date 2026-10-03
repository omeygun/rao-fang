// Kham Mueang → Central Thai normalisation with Noor's personal dictionary (spec §6.5).
// Longest-match replacement over Thai script, starting at word boundaries.
// Mirrors ml/km_normalize.py (used by km_eval.py); keep the two in sync.

export type TokKind = 'km' | 'thai' | 'unknown' | 'other';
export interface Tok { text: string; kind: TokKind; th?: string }
export interface NormResult { normalized: string; tokens: Tok[]; unknown: string[] }

const THAI = /\p{Script=Thai}/u;

/** Word-boundary offsets using Intl.Segmenter('th') when available, else every character. */
export function thaiBoundaries(text: string): number[] {
  const b = new Set<number>([0, text.length]);
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    for (const s of new Intl.Segmenter('th', { granularity: 'word' }).segment(text)) b.add(s.index);
  } else {
    for (let i = 0; i <= text.length; i++) b.add(i);
  }
  return [...b].sort((x, y) => x - y);
}

export function normalizeKm(
  text: string,
  dict: Map<string, string>,
  knownThai: Set<string> = new Set(),
  boundaries: number[] = thaiBoundaries(text),
): NormResult {
  const keys = [...dict.keys()].filter(Boolean).sort((a, b) => b.length - a.length);
  const tokens: Tok[] = [];
  const nextBoundary = (i: number) => boundaries.find((x) => x > i) ?? text.length;
  let i = 0;
  while (i < text.length) {
    if (!THAI.test(text[i])) {
      let j = i + 1;
      while (j < text.length && !THAI.test(text[j])) j++;
      tokens.push({ text: text.slice(i, j), kind: 'other' });
      i = j;
      continue;
    }
    const key = keys.find((k) => text.startsWith(k, i));
    if (key) {
      tokens.push({ text: key, kind: 'km', th: dict.get(key)! });
      i += key.length;
      continue;
    }
    let j = nextBoundary(i);
    // Keep runs of Thai together if the segmenter split mid-run on a non-Thai char.
    const seg = text.slice(i, j);
    const known = knownThai.has(seg) || seg.length < 2;
    tokens.push({ text: seg, kind: known ? 'thai' : 'unknown' });
    i = j;
  }
  // Merge adjacent unknown fragments (ICU often splits an unknown word into pieces).
  const merged: Tok[] = [];
  for (const t of tokens) {
    const last = merged[merged.length - 1];
    if (last && last.kind === 'unknown' && t.kind === 'unknown') last.text += t.text;
    else merged.push({ ...t });
  }
  return {
    normalized: merged.map((t) => (t.kind === 'km' ? t.th : t.text)).join(''),
    tokens: merged,
    unknown: [...new Set(merged.filter((t) => t.kind === 'unknown').map((t) => t.text))],
  };
}
