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

/** A template sentence: Thai fragments plus the exact English meaning, used for presenter captions. */
export type Sentence = Frag[] & { en: string };
const s = (frags: Frag[], en: string): Sentence => Object.assign(frags, { en });
const g = (n: number) => `${n} guest${n === 1 ? '' : 's'}`;
const en = (a: Aspect) => ASPECT_INFO[a].en;

export const T = {
  liked: (n: number, a: Aspect) => s([clip('guests'), num(n), clip('people_liked'), asp(a)], `${g(n)} liked ${en(a)}`),
  disliked: (n: number, a: Aspect) => s([clip('guests'), num(n), clip('people_disliked'), asp(a)], `${g(n)} disliked ${en(a)}`),
  split: (pos: number, neg: number, a: Aspect) => s([
    clip('guests'), num(pos), clip('people_liked'), num(neg), clip('people_disliked'), clip('about'), asp(a),
  ], `${g(pos)} liked, ${neg} disliked ${en(a)}`),
  mentioned: (n: number, a: Aspect) => s([clip('guests'), num(n), clip('people_mentioned'), asp(a)], `${g(n)} mentioned ${en(a)}`),
  wantToBuy: (n: number) => s([clip('guests'), num(n), clip('people_want_to_buy')], `${g(n)} want to buy coffee beans or products`),
  suggestions: (n: number) => s([clip('guests'), num(n), clip('people_suggested')], `${g(n)} made suggestions`),
  unsure: (n: number) => s([clip('there_are'), num(n), clip('unsure_items')], `${n} comment${n === 1 ? '' : 's'} the system isn't sure about — ask a person`),
  weakEvidence: () => s([clip('weak_evidence')], 'Too little data to conclude'),
  footer: () => s([clip('footer')], 'Suggestions only. You decide.'),
  noData: () => s([clip('no_data')], 'No guest feedback in this period yet'),
} satisfies Record<string, (...args: any[]) => Sentence>;

/** English meaning of a template sentence (empty for hand-built fragment lists). */
export const renderEnglish = (frags: Frag[]) => (frags as Partial<Sentence>).en ?? '';

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
