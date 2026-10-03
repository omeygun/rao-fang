// Shared UI primitives: bottom nav, toast, bottom sheet, haptics, count-up number.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BarChart3, Home, Languages, Settings } from 'lucide-react';

export const haptic = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* not supported */ } };

const NAV = [
  { href: '#/', match: (r: string) => r === '/', label: 'หน้าแรก', Icon: Home },
  { href: '#/insights', match: (r: string) => r.startsWith('/insights'), label: 'ดูสรุป', Icon: BarChart3 },
  { href: '#/teach', match: (r: string) => r.startsWith('/teach'), label: 'สอนคำ', Icon: Languages },
  { href: '#/settings', match: (r: string) => r.startsWith('/settings') || r.startsWith('/dev'), label: 'ตั้งค่า', Icon: Settings },
];

export function BottomNav({ route }: { route: string }) {
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {NAV.map(({ href, match, label, Icon }) => (
        <a key={href} href={href} className={match(route) ? 'on' : ''} aria-current={match(route) ? 'page' : undefined}>
          <Icon aria-hidden /> {label}
        </a>
      ))}
    </nav>
  );
}

// Toast: fire-and-forget from anywhere.
type ToastMsg = { id: number; text: string };
const listeners = new Set<(t: ToastMsg) => void>();
export const toast = (text: string) => listeners.forEach((l) => l({ id: Date.now(), text }));
export function ToastHost() {
  const [t, setT] = useState<ToastMsg | null>(null);
  useEffect(() => {
    const l = (m: ToastMsg) => setT(m);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), 2400);
    return () => clearTimeout(id);
  }, [t]);
  return t ? <div key={t.id} className="toast" role="status">{t.text}</div> : null;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="grab" />
        <div className="card-head"><h1 className="grow" id="sheet-title">{title}</h1><button className="speak ghost" aria-label="ปิด" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </>
  );
}

/** Number that counts up from 0 when it first appears (respects reduced motion). */
export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [v, setV] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now(), a = from.current, d = 700;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / d), e = 1 - (1 - k) ** 3;
      setV(Math.round(a + (value - a) * e));
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{v}{suffix}</>;
}
