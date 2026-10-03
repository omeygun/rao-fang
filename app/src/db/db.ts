// IndexedDB schema (spec §7). All data stays on this device.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Aspect, GuestLang, Lang, Sentiment } from '../config/aspects';

export interface ConsentRec {
  id: string;
  kind: 'guest' | 'teach' | 'helper_minor';
  lang: Lang;
  agreed: boolean;
  /** Version of the consent text shown, so it can be reproduced later. */
  textVersion: string;
  at: number;
}
export interface VisitRec {
  id: string;
  at: number;
  lang: GuestLang;
  consentId: string;
}
export interface RatingRec {
  id: string;
  visitId: string;
  stepId: string;
  aspect: Aspect;
  value: 'up' | 'down';
  at: number;
}
export interface AspectPred {
  aspect: Aspect;
  p: number;
  sentiment?: Sentiment;
  sentimentP?: number;
}
export interface ModelOutput {
  /** All aspects with probability ≥ tauLo, highest first. */
  aspects: AspectPred[];
  suggestionP: number;
  headsVersion: string;
  at: number;
}
export interface HumanLabels {
  aspects: { aspect: Aspect; sentiment?: Sentiment }[];
  isSuggestion?: boolean;
  at: number;
}
export interface FeedbackRec {
  id: string;
  visitId: string;
  at: number;
  lang: GuestLang;
  text: string;
  inputMode: 'voice' | 'text';
  /** Raw ASR transcript before the guest edited it (voice only). Audio itself is never stored. */
  asrTranscript?: string;
  status: 'pending' | 'done' | 'error';
  error?: string;
  model?: ModelOutput;
  unsure: boolean;
  unsureReasons: string[];
  thaiTranslation?: string;
  humanLabels?: HumanLabels;
}
export interface KmDictEntry {
  /** Kham Mueang spelling (Thai script), the lookup key. */
  km: string;
  th: string;
  source: 'word' | 'swap' | 'helper' | 'correction';
  at: number;
}
export interface KmPairRec {
  id: string;
  mode: 'word' | 'swap' | 'helper';
  km: string;
  th: string;
  /** Aligned word pair for swap mode. */
  wordPair?: { km: string; th: string };
  /** Only present if Noor deliberately recorded audio in Word mode. */
  audio?: Blob;
  consentId?: string;
  at: number;
}
export interface NoteRec {
  id: string;
  aspect?: Aspect;
  km: string;
  normalized: string;
  at: number;
}

interface RaoFangDB extends DBSchema {
  consents: { key: string; value: ConsentRec };
  visits: { key: string; value: VisitRec; indexes: { at: number } };
  ratings: { key: string; value: RatingRec; indexes: { visitId: string } };
  feedback: { key: string; value: FeedbackRec; indexes: { at: number; visitId: string } };
  km_dictionary: { key: string; value: KmDictEntry };
  km_pairs: { key: string; value: KmPairRec };
  notes: { key: string; value: NoteRec };
  settings: { key: string; value: unknown };
}

export type StoreName = 'consents' | 'visits' | 'ratings' | 'feedback' | 'km_dictionary' | 'km_pairs' | 'notes' | 'settings';
export const STORES: StoreName[] = ['consents', 'visits', 'ratings', 'feedback', 'km_dictionary', 'km_pairs', 'notes', 'settings'];

let dbp: Promise<IDBPDatabase<RaoFangDB>> | null = null;

export function db(): Promise<IDBPDatabase<RaoFangDB>> {
  dbp ??= openDB<RaoFangDB>('rao-fang', 1, {
    upgrade(d) {
      d.createObjectStore('consents', { keyPath: 'id' });
      d.createObjectStore('visits', { keyPath: 'id' }).createIndex('at', 'at');
      d.createObjectStore('ratings', { keyPath: 'id' }).createIndex('visitId', 'visitId');
      const fb = d.createObjectStore('feedback', { keyPath: 'id' });
      fb.createIndex('at', 'at');
      fb.createIndex('visitId', 'visitId');
      d.createObjectStore('km_dictionary', { keyPath: 'km' });
      d.createObjectStore('km_pairs', { keyPath: 'id' });
      d.createObjectStore('notes', { keyPath: 'id' });
      d.createObjectStore('settings');
    },
  });
  return dbp;
}

export const uid = () => crypto.randomUUID();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const v = await (await db()).get('settings', key);
  return v === undefined ? fallback : (v as T);
}
export async function setSetting(key: string, value: unknown) {
  await (await db()).put('settings', value, key);
}

/** Deletes every record (spec §6.6). Downloaded models are kept; only the translation-pack flag survives. */
export async function deleteAllData() {
  const d = await db();
  const pack = await d.get('settings', 'translationPack');
  const tx = d.transaction(STORES, 'readwrite');
  await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));
  if (pack !== undefined) await tx.objectStore('settings').put(pack, 'translationPack');
  await tx.done;
}

/** Delete one guest visit with its ratings, feedback and consent record. */
export async function deleteVisit(visitId: string) {
  const d = await db();
  const visit = await d.get('visits', visitId);
  const tx = d.transaction(['visits', 'ratings', 'feedback', 'consents'], 'readwrite');
  for (const r of await tx.objectStore('ratings').index('visitId').getAll(visitId)) await tx.objectStore('ratings').delete(r.id);
  for (const f of await tx.objectStore('feedback').index('visitId').getAll(visitId)) await tx.objectStore('feedback').delete(f.id);
  if (visit) await tx.objectStore('consents').delete(visit.consentId);
  await tx.objectStore('visits').delete(visitId);
  await tx.done;
}

/** Dataset export (spec §6.6): feedback, human labels and Kham Mueang pairs. Audio blobs are omitted. */
export async function exportDataset() {
  const d = await db();
  const feedback = await d.getAll('feedback');
  const pairs = await d.getAll('km_pairs');
  return {
    exportedAt: new Date().toISOString(),
    schema: 'rao-fang/1',
    note: 'Exported by explicit user action. Contains no names. Audio recordings are not included.',
    consents: await d.getAll('consents'),
    feedback: feedback.map(({ asrTranscript: _a, ...f }) => f),
    ratings: await d.getAll('ratings'),
    km_dictionary: await d.getAll('km_dictionary'),
    km_pairs: pairs.map(({ audio, ...p }) => ({ ...p, hasAudio: !!audio })),
    notes: await d.getAll('notes'),
  };
}
