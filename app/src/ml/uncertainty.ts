// Uncertainty rules (spec §6.3). Pure, unit-tested.
import type { Aspect, Lang } from '../config/aspects';
import type { Thresholds } from '../config/thresholds';

export const REASON_TH: Record<string, string> = {
  no_classifier: 'ยังไม่ได้ติดตั้งตัวจำแนก',
  borderline: 'ความมั่นใจอยู่ระหว่างกลาง',
  no_aspect: 'ไม่พบหัวข้อที่ชัดเจน',
  too_short: 'ข้อความสั้นเกินไป',
  script_mismatch: 'ภาษาไม่ตรงกับที่แขกเลือก',
  error: 'ประมวลผลไม่สำเร็จ',
};

const SCRIPT: Record<Lang, RegExp> = {
  en: /[A-Za-z]/g,
  zh: /\p{Script=Han}/gu,
  ko: /\p{Script=Hangul}/gu,
  th: /\p{Script=Thai}/gu,
};

/** Word count that works for unspaced scripts: CJK/Thai characters count roughly as words (zh: 1 char ≈ 1 word; th/ko: via Intl.Segmenter when available). */
export function wordCount(text: string, lang: Lang): number {
  const t = text.trim();
  if (!t) return 0;
  if (lang === 'zh') return (t.match(SCRIPT.zh) ?? []).length + (t.match(/[A-Za-z]+/g) ?? []).length;
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(lang, { granularity: 'word' });
    let n = 0;
    for (const s of seg.segment(t)) if (s.isWordLike) n++;
    return n;
  }
  return t.split(/\s+/).length;
}

/**
 * Minimum share of letters in the chosen script. Lower for zh/ko/th: one Han/Hangul/Thai
 * character carries more than one Latin letter, and guests code-switch ("커피 tour 좋아요").
 */
const MIN_SCRIPT_SHARE: Record<Lang, number> = { en: 0.5, zh: 0.2, ko: 0.2, th: 0.2 };

/** True if enough letters in the text are in the chosen language's script. */
export function scriptMatches(text: string, lang: Lang): boolean {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters === 0) return false;
  const inScript = (text.match(SCRIPT[lang]) ?? []).length;
  return inScript / letters >= MIN_SCRIPT_SHARE[lang];
}

export function uncertaintyReasons(
  text: string,
  lang: Lang,
  probs: { aspect: Aspect; p: number }[],
  present: Aspect[],
  th: Pick<Thresholds, 'tauHi' | 'tauLo' | 'minWords'>,
): string[] {
  const r: string[] = [];
  if (probs.some((q) => q.p >= th.tauLo && q.p < th.tauHi)) r.push('borderline');
  if (present.length === 0) r.push('no_aspect');
  if (wordCount(text, lang) < th.minWords) r.push('too_short');
  if (!scriptMatches(text, lang)) r.push('script_mismatch');
  return r;
}
