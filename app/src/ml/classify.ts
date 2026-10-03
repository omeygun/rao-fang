// On-device classification of one feedback item (spec §6.3).
import { ASPECTS, type Aspect, type GuestLang } from '../config/aspects';
import { DEFAULT_THRESHOLDS } from '../config/thresholds';
import type { AspectPred, ModelOutput } from '../db/db';
import { e5AspectInput, e5Input, embedPrefixed } from './embed';
import { binaryProb, sentimentProbs, validateHeads, type HeadsFile } from './heads';
import { uncertaintyReasons } from './uncertainty';

let headsP: Promise<HeadsFile | null> | null = null;

/** Loads heads.json; null if it has not been trained/exported yet (then every item goes to "not sure"). */
export function loadHeads(): Promise<HeadsFile | null> {
  headsP ??= fetch('/models/heads.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (validateHeads(j) ? j : null))
    .catch(() => null);
  return headsP;
}

export function thresholdsFrom(h: HeadsFile | null) {
  return { ...DEFAULT_THRESHOLDS, ...(h?.thresholds ?? {}) };
}

export async function classify(text: string, lang: GuestLang): Promise<{ model?: ModelOutput; unsure: boolean; reasons: string[] }> {
  const heads = await loadHeads();
  const th = thresholdsFrom(heads);
  if (!heads) {
    return { unsure: true, reasons: ['no_classifier'] };
  }
  const [x] = await embedPrefixed([e5Input(text)]);
  const probs = ASPECTS.map((a) => ({ aspect: a, p: binaryProb(heads.aspects[a], x) }));
  const present = probs.filter((q) => q.p >= th.tauHi).map((q) => q.aspect);

  const preds: AspectPred[] = probs.filter((q) => q.p >= th.tauLo).sort((a, b) => b.p - a.p);
  // Sentiment for each aspect at or above tauLo (shown for review; only ≥ tauHi are counted).
  if (preds.length) {
    const xs: ArrayLike<number>[] =
      heads.sentimentMode === 'aspect' ? await embedPrefixed(preds.map((p) => e5AspectInput(text, p.aspect))) : preds.map(() => x);
    preds.forEach((p, i) => {
      const sp = sentimentProbs(heads.sentiment, xs[i]);
      const k = sp.indexOf(Math.max(...sp));
      p.sentiment = heads.sentiment.classes[k];
      p.sentimentP = sp[k];
    });
  }
  const model: ModelOutput = {
    aspects: preds,
    suggestionP: binaryProb(heads.suggestion, x),
    headsVersion: heads.version,
    at: Date.now(),
  };
  const reasons = uncertaintyReasons(text, lang, probs, present as Aspect[], th);
  return { model, unsure: reasons.length > 0, reasons };
}
