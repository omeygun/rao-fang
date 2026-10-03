import { useEffect, useState } from 'react';
import { MODELS } from '../ml/env';
import { asrModel } from '../ml/asr';
import { modelCached } from '../ml/status';
import { loadHeads } from '../ml/classify';

export function Home() {
  const [ready, setReady] = useState<{ asr: boolean; embed: boolean; heads: boolean } | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    (async () => setReady({ asr: await modelCached(asrModel()), embed: await modelCached(MODELS.embed), heads: !!(await loadHeads()) }))();
    const on = () => setOnline(navigator.onLine);
    addEventListener('online', on);
    addEventListener('offline', on);
    return () => { removeEventListener('online', on); removeEventListener('offline', on); };
  }, []);
  const allReady = ready && ready.asr && ready.embed && ready.heads;
  return (
    <main className="screen home">
      <header className="home-head">
        <h1>เราฟัง</h1>
        <a className="gear" href="#/settings" aria-label="ตั้งค่า">⚙️</a>
      </header>
      <a className={'chip status ' + (allReady ? 'ok' : 'warn')} href="#/settings">
        {online ? '📶 ออนไลน์' : '✈️ ออฟไลน์'} · {ready === null ? '…' : allReady ? '✅ พร้อมใช้งานออฟไลน์' : '⬇️ ยังโหลดโมเดลไม่ครบ'}
      </a>
      <nav className="big-buttons">
        <a className="big" href="#/guest">🧳<span>ให้แขกรีวิว</span></a>
        <a className="big" href="#/insights">📊<span>ดูสรุป</span></a>
        <a className="big" href="#/teach">🗣️<span>สอนภาษาเมือง</span></a>
      </nav>
    </main>
  );
}
