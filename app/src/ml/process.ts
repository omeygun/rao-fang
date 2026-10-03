// Background processing of saved feedback (spec §6.3).
import { db, type FeedbackRec } from '../db/db';
import { classify, loadHeads } from './classify';

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

/**
 * True if an item was classified by a different (or no) classifier than the one installed now, so an app
 * update with a new heads.json re-sorts old feedback by itself. Human labels are never overwritten.
 */
export function isStale(f: FeedbackRec, headsVersion: string | undefined): boolean {
  if (f.humanLabels || !headsVersion || f.status === 'pending') return false;
  return f.status === 'error' || f.model?.headsVersion !== headsVersion;
}

/** Classify every pending or stale item. Safe to call repeatedly; runs one batch at a time. */
export function processPending(): Promise<void> {
  running ??= (async () => {
    try {
      const d = await db();
      const version = (await loadHeads())?.version;
      const pending = (await d.getAll('feedback')).filter((f) => f.status === 'pending' || isStale(f, version));
      // Mark first, so Insights shows "processing" and refreshes while old items are re-sorted.
      for (const f of pending) if (f.status !== 'pending') await d.put('feedback', { ...f, status: 'pending' });
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
