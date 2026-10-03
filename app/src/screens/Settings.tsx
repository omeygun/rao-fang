// Settings (spec §6.6, §16.2, §16.4).
import { useEffect, useRef, useState } from 'react';
import { db, deleteAllData, deleteVisit, exportDataset, getSetting, setSetting, type VisitRec } from '../db/db';
import { TopBar } from '../components/TopBar';
import { ReadyCheck } from '../components/ReadyCheck';
import { hashPin } from '../components/PinGate';
import { MODELS, MODEL_CACHE, type Progress } from '../ml/env';
import { asrModel, loadAsr } from '../ml/asr';
import { loadEmbedder } from '../ml/embed';
import { loadHeads } from '../ml/classify';
import { deletePack, installPack, packInstalled } from '../ml/translate';
import { coreAndPack, mb, measureCaches, type CacheGroup } from '../ml/cacheInfo';
import { requestPersist, persistStatus } from '../storage';
import { voicesReady } from '../audio/speak';
import { reprocessAll } from '../ml/process';
import { G } from '../i18n/guest';
import { GUEST_LANGS } from '../config/aspects';

const CORE_BUDGET = 200 * 1024 * 1024;

function useProgress(): [string, Progress] {
  const [msg, setMsg] = useState('');
  const files = useRef(new Map<string, [number, number]>()).current;
  return [msg, (p) => {
    if (p.file && p.total) files.set(p.file, [p.loaded ?? 0, p.total]);
    let l = 0, t = 0;
    for (const [a, b] of files.values()) { l += a; t += b; }
    setMsg(t ? `${p.status} ${mb(l)} / ${mb(t)}` : p.status);
  }];
}

export function Settings() {
  const [groups, setGroups] = useState<CacheGroup[]>([]);
  const [pack, setPack] = useState(false);
  const [persist, setPersist] = useState<Awaited<ReturnType<typeof persistStatus>> | null>(null);
  const [heads, setHeads] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [progress, onProgress] = useProgress();
  const [asr, setAsr] = useState(asrModel());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null);
  const [visits, setVisits] = useState<VisitRec[]>([]);
  const [voiceLangs, setVoiceLangs] = useState<string[]>([]);
  const [hasPin, setHasPin] = useState(false);

  const refresh = async () => {
    setGroups(await measureCaches());
    setPack(await packInstalled());
    setPersist(await persistStatus());
    setHeads((await loadHeads())?.version ?? null);
    setVisits((await (await db()).getAll('visits')).sort((a, b) => b.at - a.at));
    setVoiceLangs(await getSetting('voiceLangs', ['en', 'zh', 'ko']));
    setHasPin(!!(await getSetting('pinHash', null)));
  };
  useEffect(() => { refresh(); }, []);

  const run = async (label: string, f: () => Promise<unknown>) => {
    setBusy(label); setErr(null);
    try { await f(); } catch (e) { setErr(String(e)); } finally { setBusy(null); refresh(); }
  };
  const { core, pack: packBytes } = coreAndPack(groups);

  return (
    <main className="screen settings">
      <TopBar title="ตั้งค่า" />
      <ReadyCheck />

      <section className="card">
        <h2>🧠 โมเดลหลัก (ใช้ออฟไลน์)</h2>
        <p>ขนาดที่เก็บในเครื่องจริง: <strong>{mb(core)}</strong> {core > CORE_BUDGET ? '⚠️ เกิน 200 MB' : ''}</p>
        <ul className="small">
          {groups.filter((g) => !/nllb/i.test(g.name)).map((g) => <li key={g.name}>{g.name}: {mb(g.bytes)} ({g.files} ไฟล์)</li>)}
        </ul>
        <p className="small">ตัวจำแนก (heads.json): {heads ? '✅ ' + heads : '❌ ยังไม่มี — ความเห็นทั้งหมดจะไปอยู่ในคิว “ไม่แน่ใจ”'}</p>
        <label className="row small">เสียงเป็นข้อความ:
          <select value={asr} onChange={(e) => { localStorage.setItem('raofang.asrModel', e.target.value); setAsr(e.target.value as any); }}>
            <option value={MODELS.asrTiny}>whisper-tiny (เล็ก เร็ว)</option>
            <option value={MODELS.asrBase}>whisper-base (ใหญ่กว่า ช้ากว่า)</option>
          </select>
        </label>
        <button className="primary" disabled={!!busy} onClick={() => run('core', async () => {
          await loadEmbedder(onProgress);
          await loadAsr(onProgress);
          await requestPersist();
        })}>⬇️ ดาวน์โหลด / ตรวจสอบโมเดลหลัก</button>
        <button disabled={!!busy} onClick={() => run('redl', async () => {
          const c = await caches.open(MODEL_CACHE);
          for (const r of await c.keys()) if (!/nllb/i.test(r.url)) await c.delete(r);
          location.reload();
        })}>🔄 ลบแล้วดาวน์โหลดใหม่</button>
        <button disabled={!!busy} onClick={() => run('reproc', reprocessAll)}>♻️ จัดหมวดความเห็นใหม่ทั้งหมด</button>
        {busy && <p className="spinner">⏳ {progress || 'กำลังทำงาน…'}</p>}
      </section>

      <section className="card">
        <h2>🌐 ชุดแปลภาษา (ไม่บังคับ)</h2>
        <p className="small">แปลความเห็นของแขกเป็นภาษาไทย (NLLB-200) ถ้าไม่ติดตั้ง จะเห็นข้อความต้นฉบับกับหัวข้อภาษาไทย</p>
        {pack ? (
          <>
            <p>✅ ติดตั้งแล้ว · ขนาดจริง {mb(packBytes)}</p>
            <button onClick={() => run('delpack', deletePack)}>🗑️ ลบชุดแปลภาษา</button>
          </>
        ) : (
          <>
            <p className="warn small">⚠️ ไฟล์ใหญ่หลายร้อย MB ใช้ Wi-Fi เท่านั้น</p>
            <button disabled={!!busy} onClick={() => run('pack', () => installPack(onProgress))}>⬇️ ดาวน์โหลดชุดแปลภาษา</button>
          </>
        )}
      </section>

      <section className="card">
        <h2>💾 พื้นที่เก็บข้อมูล</h2>
        <p>เก็บถาวร: {persist?.persisted === true ? '✅ ได้รับอนุญาต' : persist?.persisted === false ? '❌ ไม่ได้รับอนุญาต' : 'ไม่ทราบ'}</p>
        {persist?.usage != null && <p className="small">ใช้ไป {mb(persist.usage)} จาก {mb(persist.quota ?? 0)}</p>}
        {persist?.persisted !== true && (
          <p className="warn small">Chrome อาจลบโมเดลและข้อมูลเมื่อพื้นที่เครื่องเหลือน้อย การติดตั้งแอปไว้ที่หน้าจอหลักช่วยให้ได้รับอนุญาตง่ายขึ้น</p>
        )}
        <button onClick={() => run('persist', requestPersist)}>ขออนุญาตเก็บถาวรอีกครั้ง</button>
      </section>

      <section className="card">
        <h2>🎤 พูดแทนพิมพ์ (แขก)</h2>
        {GUEST_LANGS.map((l) => (
          <label key={l} className="row small">
            <input type="checkbox" checked={voiceLangs.includes(l)} onChange={async (e) => {
              const v = e.target.checked ? [...voiceLangs, l] : voiceLangs.filter((x) => x !== l);
              await setSetting('voiceLangs', v); setVoiceLangs(v);
            }} /> {G[l].langName}
          </label>
        ))}
      </section>

      <section className="card">
        <h2>🔊 เสียงภาษาไทย</h2>
        <button onClick={async () => setVoices(await voicesReady())}>ตรวจเสียงในเครื่อง</button>
        {voices && (
          <ul className="small">
            {voices.length === 0 && <li>ไม่พบเสียงในเครื่อง</li>}
            {voices.map((v) => <li key={v.voiceURI}>{v.lang.startsWith('th') ? '✅ ' : ''}{v.name} ({v.lang}){v.localService ? ' · ออฟไลน์' : ''}</li>)}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>🔒 รหัส 4 หลัก</h2>
        <p className="small">กันคนอื่นเปิดหน้าสรุป (ไม่ได้เข้ารหัสข้อมูล)</p>
        <PinSetter hasPin={hasPin} onChange={refresh} />
      </section>

      <section className="card">
        <h2>📤 ส่งออก / 🗑️ ลบข้อมูล</h2>
        <button onClick={() => run('export', async () => {
          const blob = new Blob([JSON.stringify(await exportDataset(), null, 1)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `raofang-export-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
        })}>📤 ส่งออกข้อมูล (JSON)</button>
        <details>
          <summary>ลบรายการแขกทีละคน ({visits.length})</summary>
          {visits.map((v) => (
            <div key={v.id} className="row small">
              {new Date(v.at).toLocaleString('th-TH')} · {G[v.lang].langName}
              <button className="link" onClick={() => run('delv', () => deleteVisit(v.id))}>ลบ</button>
            </div>
          ))}
        </details>
        <button className="danger" onClick={() => {
          if (confirm('ลบข้อมูลทั้งหมด? (ความเห็นแขก บันทึก พจนานุกรม) ย้อนกลับไม่ได้')) run('delall', async () => { await deleteAllData(); });
        }}>🗑️ ลบข้อมูลทั้งหมด</button>
      </section>

      {err && <p className="warn">{err}</p>}
      <p className="small muted"><a href="#/dev/benchmark">DevBenchmark</a> · <a href="#/dev/parity">DevParity</a></p>
    </main>
  );
}

function PinSetter({ hasPin, onChange }: { hasPin: boolean; onChange: () => void }) {
  const [pin, setPin] = useState('');
  return (
    <div className="row">
      <input inputMode="numeric" pattern="[0-9]*" maxLength={4} value={pin} placeholder="••••" onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      <button disabled={pin.length !== 4} onClick={async () => { await setSetting('pinHash', await hashPin(pin)); setPin(''); onChange(); }}>{hasPin ? 'เปลี่ยนรหัส' : 'ตั้งรหัส'}</button>
      {hasPin && <button onClick={async () => { await setSetting('pinHash', null); onChange(); }}>ยกเลิกรหัส</button>}
    </div>
  );
}
