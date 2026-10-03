// Dev check (spec §7): logs every fetch made while the browser reports offline.
// After setup the app should make none that miss the cache; the log is shown on DevBenchmark.
export interface OfflineFetch { url: string; at: number; ok: boolean | null }
export const offlineFetches: OfflineFetch[] = [];

export function installOfflineFetchLogger() {
  const orig = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!navigator.onLine) {
      const rec: OfflineFetch = { url, at: Date.now(), ok: null };
      offlineFetches.push(rec);
      console.warn('[offline-fetch]', url);
      try {
        const r = await orig(input, init);
        rec.ok = r.ok;
        return r;
      } catch (e) {
        rec.ok = false;
        throw e;
      }
    }
    return orig(input, init);
  };
}
