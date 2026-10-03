// Fixed Thai sentence templates (spec §6.4, §16.3). Insights never contain generated
// prose: every sentence is a sequence of fragments filled with counts and aspect names.
// Each fragment has a stable id so it can be played from a pre-recorded clip
// (public/audio/th/manifest.json); numbers 1–30 and the 13 aspect names have clips too.
import { ASPECT_INFO, type Aspect } from './aspects';

export const FRAGMENTS = {
  guests: 'แขก',
  people_liked: 'คนชอบ',
  people_disliked: 'คนไม่ชอบ',
  people_mentioned: 'คนพูดถึง',
  about: 'เรื่อง',
  people_want_to_buy: 'คนอยากซื้อเมล็ดกาแฟหรือสินค้า',
  people_suggested: 'คนมีข้อเสนอแนะ',
  there_are: 'มี',
  unsure_items: 'ความเห็นที่ระบบไม่แน่ใจ ให้คนช่วยดู',
  weak_evidence: 'ข้อมูลน้อย ยังสรุปไม่ได้',
  footer: 'คำแนะนำเท่านั้น คุณเป็นคนตัดสินใจ',
  no_data: 'ยังไม่มีความเห็นจากแขกในช่วงนี้',
} as const;
export type FragmentId = keyof typeof FRAGMENTS;

export type Frag =
  | { kind: 'clip'; id: FragmentId }
  | { kind: 'num'; n: number }
  | { kind: 'aspect'; aspect: Aspect };

const clip = (id: FragmentId): Frag => ({ kind: 'clip', id });
const num = (n: number): Frag => ({ kind: 'num', n });
const asp = (aspect: Aspect): Frag => ({ kind: 'aspect', aspect });

/** Max number that has a recorded clip (spec §16.3: numbers 1–30). */
export const MAX_NUMBER_CLIP = 30;

export const T = {
  liked: (n: number, a: Aspect) => [clip('guests'), num(n), clip('people_liked'), asp(a)],
  disliked: (n: number, a: Aspect) => [clip('guests'), num(n), clip('people_disliked'), asp(a)],
  split: (pos: number, neg: number, a: Aspect) => [
    clip('guests'), num(pos), clip('people_liked'), num(neg), clip('people_disliked'), clip('about'), asp(a),
  ],
  mentioned: (n: number, a: Aspect) => [clip('guests'), num(n), clip('people_mentioned'), asp(a)],
  wantToBuy: (n: number) => [clip('guests'), num(n), clip('people_want_to_buy')],
  suggestions: (n: number) => [clip('guests'), num(n), clip('people_suggested')],
  unsure: (n: number) => [clip('there_are'), num(n), clip('unsure_items')],
  weakEvidence: () => [clip('weak_evidence')],
  footer: () => [clip('footer')],
  noData: () => [clip('no_data')],
} satisfies Record<string, (...args: any[]) => Frag[]>;

export function fragText(f: Frag): string {
  if (f.kind === 'clip') return FRAGMENTS[f.id];
  if (f.kind === 'num') return ` ${f.n} `;
  return ASPECT_INFO[f.aspect].th;
}

export function renderThai(frags: Frag[]): string {
  return frags.map(fragText).join('').replace(/\s+/g, ' ').trim();
}

/** Audio clip id for a fragment, or null if no clip can exist (e.g. number > 30). */
export function clipId(f: Frag): string | null {
  if (f.kind === 'clip') return `frag_${f.id}`;
  if (f.kind === 'aspect') return `aspect_${f.aspect}`;
  return f.n >= 1 && f.n <= MAX_NUMBER_CLIP ? `num_${f.n}` : null;
}
