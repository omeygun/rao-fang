// "Try the demo": loads sample visits (public/demo/demo.json) so Insights is populated on first open.
// Texts are held-out synthetic items; aspect/sentiment are the shipped model's real outputs on them.
import { db, deleteVisit, uid, type FeedbackRec } from './db/db';
import type { Aspect, GuestLang } from './config/aspects';

interface DemoVisit {
  daysAgo: number; lang: GuestLang; text: string;
  ratings: { stepId: string; aspect: Aspect; value: 'up' | 'down' }[];
  model: FeedbackRec['model'] & object; unsure: boolean; unsureReasons: string[];
}

export async function hasDemo(): Promise<boolean> {
  return (await (await db()).getAll('visits')).some((v) => v.demo);
}

export async function loadDemo(): Promise<number> {
  if (await hasDemo()) return 0;
  const { visits } = (await (await fetch('/demo/demo.json')).json()) as { visits: DemoVisit[] };
  const d = await db();
  for (const v of visits) {
    const at = Date.now() - v.daysAgo * 86400_000 - Math.round(Math.random() * 3600_000);
    const id = uid(), consentId = uid();
    await d.put('consents', { id: consentId, kind: 'guest', lang: v.lang, agreed: true, textVersion: 'demo', at });
    await d.put('visits', { id, at, lang: v.lang, consentId, demo: true });
    for (const r of v.ratings) await d.put('ratings', { id: uid(), visitId: id, at, ...r });
    await d.put('feedback', {
      id: uid(), visitId: id, at, lang: v.lang, text: v.text, inputMode: 'text', status: 'done',
      model: { ...v.model, at }, unsure: v.unsure, unsureReasons: v.unsureReasons,
    });
  }
  return visits.length;
}

export async function clearDemo() {
  for (const v of await (await db()).getAll('visits')) if (v.demo) await deleteVisit(v.id);
}
