// Optional 4-digit PIN for Noor's screens (spec §10). A convenience lock against casual
// access on a shared phone, NOT encryption: data in browser storage is not encrypted.
import { useEffect, useState, type ReactNode } from 'react';
import { getSetting } from '../db/db';

export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('raofang-pin:' + pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function PinGate({ children, onUnlock }: { children: ReactNode; onUnlock: () => void }) {
  const [hash, setHash] = useState<string | null | undefined>(undefined);
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  useEffect(() => {
    getSetting<string | null>('pinHash', null).then(setHash);
  }, []);
  useEffect(() => {
    if (hash === null) onUnlock();
  }, [hash, onUnlock]);
  useEffect(() => {
    if (pin.length === 4 && hash) {
      hashPin(pin).then((h) => {
        if (h === hash) onUnlock();
        else {
          setWrong(true);
          setPin('');
        }
      });
    }
  }, [pin, hash, onUnlock]);

  if (hash === undefined) return null;
  if (hash === null) return <>{children}</>;
  return (
    <main className="screen center">
      <h1>🔒 ใส่รหัส 4 หลัก</h1>
      <div className="pin-dots">{[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? 'on' : ''} />)}</div>
      {wrong && <p className="warn">รหัสไม่ถูกต้อง</p>}
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => (
          <button key={k || 'blank'} disabled={!k} onClick={() => { setWrong(false); setPin((p) => (k === '⌫' ? p.slice(0, -1) : (p + k).slice(0, 4))); }}>
            {k}
          </button>
        ))}
      </div>
      <p className="muted"><a href="#/guest">ให้แขกรีวิว (ไม่ต้องใช้รหัส)</a></p>
    </main>
  );
}
