// Insights engine (spec §6.4): counts + thresholds + real quotes + fixed Thai templates.
// No generative text. Pure function over stored records, unit-tested.
import { ASPECTS, type Aspect, type Sentiment } from '../config/aspects';
import { T, type Frag } from '../config/thai_templates';
import type { Thresholds } from '../config/thresholds';
import type { FeedbackRec, RatingRec, VisitRec } from '../db/db';

export type Period = 'week' | 'month' | 'all';

export function periodStart(period: Period, now = new Date()): number {
  if (period === 'all') return 0;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === 'month') d.setDate(1);
  else d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d.getTime();
}

export interface Evidence {
  feedbackId: string;
  visitId: string;
  sentiment?: Sentiment;
  source: 'model' | 'human';
}
export interface AspectCard {
  aspect: Aspect;
  /** Distinct guests who mentioned or rated this aspect. */
  n: number;
  up: number;
  down: number;
  weak: boolean;
  sentence: Frag[];
  evidence: Evidence[];
}
export interface Insights {
  cards: AspectCard[];
  buy: { n: number; weak: boolean; sentence: Frag[]; evidence: Evidence[] };
  suggestions: { n: number; sentence: Frag[]; evidence: Evidence[] };
  unsure: FeedbackRec[];
  unsureSentence: Frag[];
  guests: number;
}

/** Labels that count for insights: human labels win; model labels only when confident. */
export function effectiveLabels(f: FeedbackRec, th: Pick<Thresholds, 'tauHi'>):
  | { aspects: { aspect: Aspect; sentiment?: Sentiment }[]; isSuggestion: boolean; source: 'model' | 'human' }
  | null {
  if (f.humanLabels) {
    return { aspects: f.humanLabels.aspects, isSuggestion: !!f.humanLabels.isSuggestion, source: 'human' };
  }
  if (f.status !== 'done' || f.unsure || !f.model) return null;
  return {
    aspects: f.model.aspects.filter((a) => a.p >= th.tauHi).map((a) => ({ aspect: a.aspect, sentiment: a.sentiment })),
    isSuggestion: f.model.suggestionP >= th.tauHi,
    source: 'model',
  };
}

export function buildInsights(
  data: { visits: VisitRec[]; ratings: RatingRec[]; feedback: FeedbackRec[] },
  period: Period,
  th: Pick<Thresholds, 'tauHi' | 'weakEvidenceN'>,
  now = new Date(),
): Insights {
  const since = periodStart(period, now);
  const visits = new Set(data.visits.filter((v) => v.at >= since).map((v) => v.id));
  const ratings = data.ratings.filter((r) => visits.has(r.visitId));
  const feedback = data.feedback.filter((f) => visits.has(f.visitId));

  // per aspect → per guest → set of sentiments seen
  const signals = new Map<Aspect, Map<string, Set<Sentiment | 'none'>>>();
  const evidence = new Map<Aspect, Evidence[]>();
  const sig = (a: Aspect, visit: string, s: Sentiment | 'none') => {
    const m = signals.get(a) ?? new Map();
    const set = m.get(visit) ?? new Set();
    set.add(s);
    m.set(visit, set);
    signals.set(a, m);
  };
  for (const r of ratings) sig(r.aspect, r.visitId, r.value === 'up' ? 'positive' : 'negative');

  const unsure: FeedbackRec[] = [];
  const suggestionEv: Evidence[] = [];
  for (const f of feedback) {
    const lab = effectiveLabels(f, th);
    if (!lab) {
      if (f.unsure || f.status === 'error') unsure.push(f);
      continue;
    }
    for (const { aspect, sentiment } of lab.aspects) {
      sig(aspect, f.visitId, sentiment ?? 'none');
      const ev = evidence.get(aspect) ?? [];
      ev.push({ feedbackId: f.id, visitId: f.visitId, sentiment, source: lab.source });
      evidence.set(aspect, ev);
    }
    if (lab.isSuggestion) suggestionEv.push({ feedbackId: f.id, visitId: f.visitId, source: lab.source });
  }

  const cards: AspectCard[] = [];
  for (const aspect of ASPECTS) {
    if (aspect === 'purchase_interest') continue;
    const m = signals.get(aspect);
    if (!m || m.size === 0) continue;
    let up = 0, down = 0;
    for (const s of m.values()) {
      // A "mixed" opinion counts as a mention only: one ambivalent guest must not add both 👍 and 👎.
      if (s.has('positive')) up++;
      if (s.has('negative')) down++;
    }
    const n = m.size;
    const sentence = up && !down ? T.liked(up, aspect) : down && !up ? T.disliked(down, aspect) : up && down ? T.split(up, down, aspect) : T.mentioned(n, aspect);
    cards.push({ aspect, n, up, down, weak: n < th.weakEvidenceN, sentence, evidence: evidence.get(aspect) ?? [] });
  }
  cards.sort((a, b) => b.n - a.n || b.up + b.down - (a.up + a.down));

  const buyGuests = new Set((evidence.get('purchase_interest') ?? []).map((e) => e.visitId));
  const sugGuests = new Set(suggestionEv.map((e) => e.visitId));
  unsure.sort((a, b) => b.at - a.at);
  return {
    cards,
    buy: { n: buyGuests.size, weak: buyGuests.size < th.weakEvidenceN, sentence: T.wantToBuy(buyGuests.size), evidence: evidence.get('purchase_interest') ?? [] },
    suggestions: { n: sugGuests.size, sentence: T.suggestions(sugGuests.size), evidence: suggestionEv },
    unsure,
    unsureSentence: T.unsure(unsure.length),
    guests: visits.size,
  };
}
