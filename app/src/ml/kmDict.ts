import { db } from '../db/db';
import teachWords from '../config/teach_words.json';
import thaiCommon from '../config/thai_common.json';
import { FRAGMENTS } from '../config/thai_templates';

export async function loadKmDict(): Promise<Map<string, string>> {
  const all = await (await db()).getAll('km_dictionary');
  return new Map(all.map((e) => [e.km, e.th]));
}

/** Central Thai words treated as "known" (not flagged as unknown) in Noor's notes. */
export function knownThaiWords(dict?: Map<string, string>): Set<string> {
  const s = new Set<string>(thaiCommon as string[]);
  for (const w of teachWords as { th: string }[]) s.add(w.th);
  for (const f of Object.values(FRAGMENTS)) for (const w of f.split(/\s+/)) s.add(w);
  if (dict) for (const th of dict.values()) s.add(th);
  return s;
}
