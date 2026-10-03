import { describe, expect, it } from 'vitest';
import { normalizeKm } from '../ml/kmNormalize';
import { scriptMatches, uncertaintyReasons, wordCount } from '../ml/uncertainty';
import { binaryProb, sentimentProbs, softmax } from '../ml/heads';
import { buildInsights, periodStart } from '../insights/engine';
import { clipId, renderThai, T } from '../config/thai_templates';
import { ASPECTS } from '../config/aspects';
import type { FeedbackRec, RatingRec, VisitRec } from '../db/db';
import cases from '../../../ml/data/km_normalize_cases.json';

describe('kmNormalize', () => {
  // Test dictionary entries are made-up placeholders, not real Kham Mueang data.
  it('replaces longest match first and flags unknown words', () => {
    const dict = new Map([['กขค', 'หนึ่ง'], ['กข', 'สอง']]);
    const r = normalizeKm('กขคกข', dict, new Set(), [0, 5]);
    expect(r.normalized).toBe('หนึ่งสอง');
    expect(r.tokens.map((t) => t.kind)).toEqual(['km', 'km']);
  });
  it('keeps non-Thai text and marks unknown Thai segments', () => {
    const r = normalizeKm('ฉัน zz ฮฮฮ', new Map(), new Set(['ฉัน']));
    expect(r.normalized).toBe('ฉัน zz ฮฮฮ');
    expect(r.unknown).toEqual(['ฮฮฮ']);
  });
  it('matches the shared JS/Python test cases', () => {
    for (const c of cases as { text: string; dict: Record<string, string>; expected: string }[]) {
      expect(normalizeKm(c.text, new Map(Object.entries(c.dict)), new Set(), [...Array(c.text.length + 1).keys()]).normalized).toBe(c.expected);
    }
  });
});

describe('uncertainty', () => {
  const th = { tauHi: 0.6, tauLo: 0.35, minWords: 3 };
  it('counts words across scripts', () => {
    expect(wordCount('the tour was great', 'en')).toBe(4);
    expect(wordCount('咖啡很好喝', 'zh')).toBe(5);
    expect(wordCount('커피가 정말 맛있어요', 'ko')).toBe(3);
  });
  it('detects script mismatch', () => {
    expect(scriptMatches('좋아요 coffee', 'ko')).toBe(true);
    expect(scriptMatches('the coffee was great', 'ko')).toBe(false);
    expect(scriptMatches('咖啡', 'zh')).toBe(true);
  });
  it('flags borderline, no aspect and short texts', () => {
    expect(uncertaintyReasons('the tasting was wonderful', 'en', [{ aspect: 'tasting', p: 0.9 }], ['tasting'], th)).toEqual([]);
    expect(uncertaintyReasons('the tasting was wonderful', 'en', [{ aspect: 'tasting', p: 0.5 }], [], th)).toEqual(['borderline', 'no_aspect']);
    expect(uncertaintyReasons('ok', 'en', [{ aspect: 'tasting', p: 0.9 }], ['tasting'], th)).toEqual(['too_short']);
  });
});

describe('heads math', () => {
  it('sigmoid/softmax behave', () => {
    expect(binaryProb({ w: [1, 0], b: 0 }, [0, 5])).toBeCloseTo(0.5);
    expect(softmax([0, 0, 0]).every((p) => Math.abs(p - 1 / 3) < 1e-9)).toBe(true);
    const p = sentimentProbs({ classes: ['positive', 'negative', 'mixed'], W: [[10], [0], [0]], b: [0, 0, 0] }, [1]);
    expect(p[0]).toBeGreaterThan(0.99);
  });
});

describe('templates', () => {
  it('render Thai sentences with counts', () => {
    expect(renderThai(T.liked(5, 'tasting'))).toBe('แขก 5 คนชอบการชิมกาแฟ');
    expect(clipId({ kind: 'num', n: 31 })).toBeNull();
    expect(clipId({ kind: 'num', n: 30 })).toBe('num_30');
  });
});

describe('insights engine', () => {
  const now = new Date('2026-10-03T12:00:00');
  const at = now.getTime() - 3600_000;
  const visits: VisitRec[] = ['v1', 'v2', 'v3'].map((id) => ({ id, at, lang: 'en', consentId: 'c' + id }));
  const ratings: RatingRec[] = [
    { id: 'r1', visitId: 'v1', stepId: 'tasting', aspect: 'tasting', value: 'up', at },
    { id: 'r2', visitId: 'v2', stepId: 'tasting', aspect: 'tasting', value: 'up', at },
    { id: 'r3', visitId: 'v3', stepId: 'walk', aspect: 'walk_trail', value: 'down', at },
  ];
  const fb = (id: string, visitId: string, extra: Partial<FeedbackRec>): FeedbackRec => ({
    id, visitId, at, lang: 'en', text: 'x', inputMode: 'text', status: 'done', unsure: false, unsureReasons: [], ...extra,
  });
  const feedback: FeedbackRec[] = [
    fb('f1', 'v1', { model: { aspects: [{ aspect: 'purchase_interest', p: 0.9, sentiment: 'positive' }, { aspect: 'tasting', p: 0.8, sentiment: 'positive' }], suggestionP: 0.1, headsVersion: 't', at } }),
    fb('f2', 'v2', { unsure: true, unsureReasons: ['borderline'], model: { aspects: [{ aspect: 'food', p: 0.5 }], suggestionP: 0.7, headsVersion: 't', at } }),
    fb('f3', 'v3', { unsure: true, unsureReasons: ['no_aspect'], humanLabels: { aspects: [{ aspect: 'walk_trail', sentiment: 'negative' }], isSuggestion: true, at } }),
  ];
  const ins = buildInsights({ visits, ratings, feedback }, 'week', { tauHi: 0.6, weakEvidenceN: 3 }, now);

  it('counts distinct guests per aspect and merges ratings with text', () => {
    const tasting = ins.cards.find((c) => c.aspect === 'tasting')!;
    expect(tasting.n).toBe(2);
    expect(tasting.up).toBe(2);
    expect(renderThai(tasting.sentence)).toBe('แขก 2 คนชอบการชิมกาแฟ');
    expect(tasting.weak).toBe(true);
  });
  it('uses human labels and keeps unsure items out of counts', () => {
    expect(ins.cards.find((c) => c.aspect === 'food')).toBeUndefined();
    expect(ins.unsure.map((f) => f.id)).toEqual(['f2']);
    expect(ins.cards.find((c) => c.aspect === 'walk_trail')!.down).toBe(1);
    expect(ins.suggestions.n).toBe(1);
  });
  it('has a separate purchase card', () => {
    expect(ins.buy.n).toBe(1);
    expect(ins.cards.some((c) => c.aspect === 'purchase_interest')).toBe(false);
  });
  it('period filter', () => {
    expect(periodStart('week', now)).toBe(new Date('2026-09-28T00:00:00').getTime());
    expect(buildInsights({ visits, ratings, feedback }, 'week', { tauHi: 0.6, weakEvidenceN: 3 }, new Date('2026-10-20')).guests).toBe(0);
  });
  it('schema has 13 aspects', () => expect(ASPECTS.length).toBe(13));
});
