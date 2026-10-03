// Minimal hash router: #/guest, #/insights, #/teach, #/settings, #/dev/benchmark, #/dev/parity
import { useEffect, useState } from 'react';

export function useRoute(): string {
  const [r, setR] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => setR(location.hash.slice(1) || '/');
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return r;
}
export const go = (path: string) => (location.hash = path);
