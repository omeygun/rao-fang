// One-glance pre-demo checklist (Thai): is this phone ready to run the whole loop in airplane mode?
import { useEffect, useState } from 'react';
import { MODELS } from '../ml/env';
import { asrModel } from '../ml/asr';
import { modelCached } from '../ml/status';
import { loadHeads } from '../ml/classify';
import { voicesReady } from '../audio/speak';
import { En } from './ui';

interface Check { ok: boolean; label: string; en: string; fix: string }

async function runChecks(): Promise<Check[]> {
  const thVoice = (await voicesReady()).some((v) => v.lang.toLowerCase().startsWith('th'));
  const clips = await fetch('/audio/th/manifest.json').then((r) => r.json()).then((m) => Object.keys(m.clips ?? {}).length).catch(() => 0);
  const persisted = (await navigator.storage?.persisted?.()) ?? false;
  return [
    { ok: !!globalThis.crossOriginIsolated, label: 'เปิดผ่านลิงก์ https ที่ถูกต้อง', en: 'Opened from a proper https link', fix: 'เปิดแอปจากลิงก์ https ของ Vercel/Netlify ไม่ใช่ไฟล์หรือ IP' },
    { ok: !!navigator.serviceWorker?.controller, label: 'แอปเก็บไว้ใช้ออฟไลน์แล้ว', en: 'App saved for offline use', fix: 'เปิดแอปตอนมีเน็ต 1 ครั้ง แล้วปิดเปิดใหม่' },
    { ok: await modelCached(MODELS.embed), label: 'โมเดลจัดหมวดอยู่ในเครื่อง', en: 'Topic model on this phone', fix: 'กด ⬇️ ดาวน์โหลด / ตรวจสอบโมเดลหลัก (ใช้ Wi-Fi)' },
    { ok: await modelCached(asrModel()), label: 'โมเดลฟังเสียงแขกอยู่ในเครื่อง', en: 'Speech model on this phone', fix: 'กด ⬇️ ดาวน์โหลด / ตรวจสอบโมเดลหลัก (ใช้ Wi-Fi)' },
    { ok: !!(await loadHeads()), label: 'ตัวจำแนกพร้อม', en: 'Classifier ready', fix: 'อัปเดตแอป (เปิดตอนมีเน็ต) — ถ้ายังไม่ได้ ติดต่อผู้พัฒนา' },
    { ok: persisted, label: 'เครื่องจะไม่ลบข้อมูลเอง', en: 'Storage is persistent', fix: 'ติดตั้งแอปไว้หน้าจอหลัก แล้วกด “ขออนุญาตเก็บถาวรอีกครั้ง”' },
    { ok: clips > 0 || thVoice, label: 'มีเสียงอ่านภาษาไทย', en: 'Thai read-aloud voice available', fix: 'ติดตั้งเสียงภาษาไทยในการตั้งค่า Android › การอ่านออกเสียง' },
    { ok: matchMedia('(display-mode: standalone)').matches, label: 'ติดตั้งไว้ที่หน้าจอหลักแล้ว', en: 'Installed to home screen', fix: 'เมนู Chrome ⋮ › ติดตั้งแอป / เพิ่มลงในหน้าจอหลัก' },
  ];
}

export function ReadyCheck() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const refresh = () => { setChecks(null); runChecks().then(setChecks); };
  useEffect(refresh, []);
  const bad = checks?.filter((c) => !c.ok) ?? [];
  return (
    <section className={'card ' + (checks && !bad.length ? 'ready-ok' : 'unsure')}>
      <div className="card-head">
        <span className="icon" aria-hidden>{!checks ? '⏳' : bad.length ? '⚠️' : '✅'}</span>
        <h2>พร้อมใช้ออฟไลน์ไหม?<En>Ready to run offline?</En></h2>
        <button className="speak" aria-label="ตรวจอีกครั้ง" onClick={refresh}>🔄</button>
      </div>
      <p className="sentence">{!checks ? 'กำลังตรวจ…' : bad.length ? `ยังขาด ${bad.length} อย่าง` : 'พร้อมแล้ว เปิดโหมดเครื่องบินได้เลย'}<En>{!checks ? 'Checking…' : bad.length ? `${bad.length} item(s) missing` : 'Ready — airplane mode is fine'}</En></p>
      <ul className="checks">
        {checks?.map((c) => (
          <li key={c.label}>
            {c.ok ? '✅' : '❌'} {c.label}<En>{c.en}</En>
            {!c.ok && <div className="small warn">→ {c.fix}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}
