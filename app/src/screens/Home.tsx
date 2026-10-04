import { useEffect, useState } from 'react';
import { ChevronRight, PlaneTakeoff, Wifi } from 'lucide-react';
import { MODELS } from '../ml/env';
import { asrModel } from '../ml/asr';
import { modelCached } from '../ml/status';
import { loadHeads } from '../ml/classify';
import { db } from '../db/db';
import { periodStart } from '../insights/engine';
import { CaptionToggle, En } from '../components/ui';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'; };

export function Home() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [week, setWeek] = useState<{ guests: number; unsure: number } | null>(null);
  useEffect(() => {
    (async () => setReady((await modelCached(asrModel())) && (await modelCached(MODELS.embed)) && !!(await loadHeads())))();
    (async () => {
      const d = await db(), since = periodStart('week');
      const visits = new Set((await d.getAll('visits')).filter((v) => v.at >= since).map((v) => v.id));
      const unsure = (await d.getAll('feedback')).filter((f) => f.unsure && !f.humanLabels).length;
      setWeek({ guests: visits.size, unsure });
    })();
    const on = () => setOnline(navigator.onLine);
    addEventListener('online', on);
    addEventListener('offline', on);
    return () => { removeEventListener('online', on); removeEventListener('offline', on); };
  }, []);
  return (
    <main className="screen home">
      <header className="home-head">
        <div className="brandmark"><img src="/icon-192.png" alt="" /><div><p className="muted small" style={{ margin: 0 }}>{greeting()}</p><h1>เราฟัง</h1><En>Rao Fang — “we listen”</En></div></div>
        <CaptionToggle />
      </header>
      <a className={'chip status ' + (ready ? 'ok' : 'warn')} href="#/settings" style={{ marginTop: 16 }}>
        {online ? <Wifi aria-hidden /> : <PlaneTakeoff aria-hidden />} <span>{online ? 'ออนไลน์' : 'ออฟไลน์'} · {ready === null ? '…' : ready ? 'พร้อมใช้งานออฟไลน์' : 'ยังโหลดโมเดลไม่ครบ'}
        <En>{online ? 'Online' : 'Offline'} · {ready ? 'ready offline' : 'models not downloaded yet'}</En></span>
      </a>
      <nav className="big-buttons stagger">
        <a className="big hero" href="#/guest">
          <span className="tile">🧳</span>
          <span className="grow">ให้แขกรีวิว<small>ส่งโทรศัพท์ให้แขก · English · 中文 · 한국어</small><En>Guest feedback — hand the phone to the guest</En></span>
          <ChevronRight aria-hidden />
        </a>
        <a className="big" href="#/insights">
          <span className="tile">📊</span>
          <span className="grow">ดูสรุป<small>{week ? `สัปดาห์นี้ แขก ${week.guests} คน${week.unsure ? ` · รอให้ช่วยดู ${week.unsure}` : ''}` : '…'}</small><En>{week ? `Insights — ${week.guests} guests this week${week.unsure ? `, ${week.unsure} to review` : ''}` : 'Insights'}</En></span>
          <ChevronRight aria-hidden />
        </a>
        <a className="big" href="#/teach">
          <span className="tile">🗣️</span>
          <span className="grow">สอนภาษาเมือง<small>สอนคำ ให้แอปเข้าใจบันทึกของคุณ</small><En>Teach Kham Mueang (Northern Thai) words</En></span>
          <ChevronRight aria-hidden />
        </a>
      </nav>
    </main>
  );
}
