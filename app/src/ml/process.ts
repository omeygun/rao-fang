// Background processing of saved feedback (spec §6.3).
import { db, type FeedbackRec } from '../db/db';
import { classify } from './classify';

let running: Promise<void> | null = null;

export async function processOne(f: FeedbackRec): Promise<FeedbackRec> {
  try {
    const r = await classify(f.text, f.lang);
    return { ...f, status: 'done', model: r.model, unsure: r.unsure, unsureReasons: r.reasons, error: undefined };
  } catch (e) {
    // Fail safe: anything that breaks lands in the "not sure" queue with the original text.
    return { ...f, status: 'error', error: String(e), unsure: true, unsureReasons: ['error'] };
  }
}

/** Classify every pending item. Safe to call repeatedly; runs one batch at a time. */
export function processPending(): Promise<void> {
  running ??= (async () => {
    try {
      const d = await db();
      const pending = (await d.getAll('feedback')).filter((f) => f.status === 'pending');
      for (const f of pending) await d.put('feedback', await processOne(f));
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Re-run the classifier on every item without human labels (e.g. after new heads.json). */
export async function reprocessAll() {
  const d = await db();
  for (const f of await d.getAll('feedback')) if (!f.humanLabels) await d.put('feedback', { ...f, status: 'pending' });
  await processPending();
}
