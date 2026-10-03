// Minimal hash router with View Transitions: #/guest, #/insights, #/teach, #/settings, #/dev/*
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

const current = () => location.hash.slice(1) || '/';

export function useRoute(): string {
  const [r, setR] = useState(current);
  useEffect(() => {
    const on = () => {
      const next = current();
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        doc.startViewTransition(() => flushSync(() => setR(next)));
      } else setR(next);
      scrollTo({ top: 0 });
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return r;
}
export const go = (path: string) => (location.hash = path);
