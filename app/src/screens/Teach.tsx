// Teach Mode (spec §6.5): Noor teaches Kham Mueang. All opt-in, no passive recording.
import { useEffect, useRef, useState } from 'react';
import teachWords from '../config/teach_words.json';
import teachSentences from '../config/teach_sentences.json';
import { db, getSetting, setSetting, uid, type KmDictEntry } from '../db/db';
import { TopBar } from '../components/TopBar';
import { speakTextThai } from '../audio/speak';
import { NO_VOICE_TH } from '../components/Speak';
import { go } from '../nav';
import { ChevronRight } from 'lucide-react';
import { haptic, toast } from '../components/ui';

const TEACH_CONSENT = 'teach-v1';
const HELPER_CONSENT = 'helper-minor-v1';

function query(route: string) {
  return new URLSearchParams(route.split('?')[1] ?? '');
}

async function addToDict(km: string, th: string, source: KmDictEntry['source']) {
  km = km.trim();
  th = th.trim();
  if (km && th) await (await db()).put('km_dictionary', { km, th, source, at: Date.now() });
}

export function Teach({ route }: { route: string }) {
  const [consented, setConsented] = useState<boolean | null>(null);
  useEffect(() => { getSetting('teachConsent', false).then(setConsented); }, []);
  if (consented === null) return null;
  if (!consented)
    return (
      <main className="screen">
        <TopBar title="สอนภาษาเมือง" />
        <ul className="consent">
          <li>คุณสอนคำภาษาเมือง (คำเมือง) ให้แอปนี้ เพื่อให้แอปเข้าใจบันทึกของคุณ</li>
          <li>ทุกอย่างเก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งขึ้นอินเทอร์เน็ต</li>
          <li>แอปไม่อัดเสียงเอง จะอัดเสียงเฉพาะเมื่อคุณกดปุ่มอัดเสียงเท่านั้น</li>
          <li>ลบได้ทุกเมื่อ ที่หน้านี้หรือที่ ⚙️ ตั้งค่า</li>
        </ul>
        <button className="primary big-btn" onClick={async () => {
          await (await db()).put('consents', { id: uid(), kind: 'teach', lang: 'th', agreed: true, textVersion: TEACH_CONSENT, at: Date.now() });
          await setSetting('teachConsent', true);
          setConsented(true);
        }}>ตกลง เริ่มสอน</button>
      </main>
    );
  if (route.startsWith('/teach/word')) return <WordMode q={query(route)} />;
  if (route.startsWith('/teach/swap')) return <SwapMode />;
  if (route.startsWith('/teach/helper')) return <HelperMode />;
  if (route.startsWith('/teach/dict')) return <DictView />;
  return (
    <main className="screen">
      <TopBar title="สอนภาษาเมือง" />
      <TeachProgress />
      <nav className="big-buttons stagger">
        <a className="big hero" href="#/teach/word"><span className="tile">🔤</span><span className="grow">สอนคำ<small>ดูรูปกับคำไทย แล้วพิมพ์เป็นคำเมือง</small></span><ChevronRight aria-hidden /></a>
        <a className="big" href="#/teach/swap"><span className="tile">🔁</span><span className="grow">เปลี่ยนคำในประโยค<small>เปลี่ยนคำที่ไฮไลต์เป็นคำเมือง</small></span><ChevronRight aria-hidden /></a>
        <a className="big" href="#/teach/helper"><span className="tile">👧</span><span className="grow">ลูกช่วยแปล<small>แม่พิมพ์คำเมือง ลูกพิมพ์ภาษาไทย</small></span><ChevronRight aria-hidden /></a>
        <a className="big" href="#/teach/dict"><span className="tile">📖</span><span className="grow">พจนานุกรมของฉัน<small>ดู แก้ หรือลบคำที่สอนไว้</small></span><ChevronRight aria-hidden /></a>
      </nav>
    </main>
  );
}

/** How many of the starter words Noor has taught, plus total dictionary size. */
function TeachProgress() {
  const [p, setP] = useState<{ taught: number; total: number } | null>(null);
  useEffect(() => {
    (async () => {
      const dict = await (await db()).getAll('km_dictionary');
      const th = new Set(dict.map((e) => e.th));
      setP({ taught: (teachWords as { th: string }[]).filter((w) => th.has(w.th)).length, total: dict.length });
    })();
  }, []);
  if (!p) return null;
  const pct = Math.round((100 * p.taught) / teachWords.length);
  return (
    <section className="card reveal">
      <div className="card-head"><span className="tile">🌱</span><h2>ความคืบหน้า</h2><b>{pct}%</b></div>
      <p className="sentence">สอนแล้ว {p.taught}/{teachWords.length} คำ</p>
      <div className="progress" aria-hidden><i style={{ width: `${pct}%` }} /></div>
      <p className="muted small">ในพจนานุกรมทั้งหมด {p.total} คำ · ยิ่งสอนมาก แอปยิ่งเข้าใจบันทึกของคุณ</p>
    </section>
  );
}

function WordMode({ q }: { q: URLSearchParams }) {
  const prefillKm = q.get('km');
  const ret = q.get('return');
  const [i, setI] = useState(0);
  const [km, setKm] = useState(prefillKm ?? '');
  const [th, setTh] = useState('');
  const [audio, setAudio] = useState<Blob | null>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [saved, setSaved] = useState(0);
  const chunks = useRef<Blob[]>([]);
  const w = (teachWords as { id: string; th: string; icon: string }[])[i % teachWords.length];

  const record = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new MediaRecorder(stream);
    chunks.current = [];
    r.ondataavailable = (e) => chunks.current.push(e.data);
    r.onstop = () => { stream.getTracks().forEach((t) => t.stop()); setAudio(new Blob(chunks.current, { type: r.mimeType })); };
    r.start();
    setRec(r);
  };

  const save = async () => {
    const thai = prefillKm ? th : w.th;
    if (!km.trim() || !thai.trim()) return;
    await (await db()).put('km_pairs', { id: uid(), mode: 'word', km: km.trim(), th: thai.trim(), audio: audio ?? undefined, at: Date.now() });
    await addToDict(km, thai, 'word');
    setSaved(saved + 1);
    haptic(18);
    toast(`บันทึกแล้ว ✓ ${km.trim()} = ${thai.trim()}`);
    setAudio(null);
    if (prefillKm) {
      go(ret ?? '/teach');
      return;
    }
    setKm('');
    setI(i + 1);
  };

  return (
    <main className="screen">
      <TopBar title="สอนคำ" back="#/teach" />
      {prefillKm ? (
        <>
          <p>คำนี้ในภาษาไทยกลางคือ?</p>
          <p className="word-card"><mark className="unknown">{prefillKm}</mark></p>
          <input value={km} onChange={(e) => setKm(e.target.value)} aria-label="คำเมือง" />
          <input value={th} autoFocus placeholder="ภาษาไทยกลาง" onChange={(e) => setTh(e.target.value)} />
        </>
      ) : (
        <>
          <div className="progress" aria-hidden><i style={{ width: `${(100 * (i % teachWords.length)) / teachWords.length}%` }} /></div>
          <p className="muted small">คำที่ {(i % teachWords.length) + 1}/{teachWords.length}</p>
          <p className="word-card" key={i}><span className="icon">{w.icon}</span> {w.th}</p>
          <p>คำนี้ภาษาเมืองเขียนว่าอะไร?</p>
          <input value={km} autoFocus placeholder="พิมพ์คำเมือง" onChange={(e) => setKm(e.target.value)} />
        </>
      )}
      <div className="row">
        {rec ? <button className="rec on" onClick={() => { rec.stop(); setRec(null); }}>⏹ หยุด</button>
          : <button className="rec" onClick={record}>🎙️ อัดเสียง (ไม่บังคับ)</button>}
        {audio && <span className="small">✅ มีเสียงแล้ว <button className="link small" onClick={() => setAudio(null)}>ลบเสียง</button></span>}
      </div>
      <div className="row">
        <button className="primary" disabled={!km.trim() || (!!prefillKm && !th.trim())} onClick={save}>บันทึก</button>
        {!prefillKm && <button onClick={() => { setKm(''); setI(i + 1); }}>ข้าม</button>}
      </div>
      {saved > 0 && <p className="muted">สอนแล้ว {saved} คำ 🎉</p>}
    </main>
  );
}

/** Find the Kham Mueang word aligned to the highlighted Thai word: same prefix/suffix, different middle. */
export function alignSwap(thSentence: string, word: string, kmSentence: string): string | null {
  const at = thSentence.indexOf(word);
  if (at < 0) return null;
  const pre = thSentence.slice(0, at), post = thSentence.slice(at + word.length);
  const k = kmSentence.trim();
  if (k.startsWith(pre) && k.endsWith(post) && k.length > pre.length + post.length) return k.slice(pre.length, k.length - post.length);
  return null;
}

function SwapMode() {
  const [i, setI] = useState(0);
  const s = (teachSentences as { id: string; th: string; word: string }[])[i % teachSentences.length];
  const [km, setKm] = useState('');
  const [kmWord, setKmWord] = useState('');
  const [noVoice, setNoVoice] = useState(false);
  useEffect(() => { setKm(s.th); setKmWord(''); }, [s.th]);
  useEffect(() => { const a = alignSwap(s.th, s.word, km); if (a) setKmWord(a); }, [km, s]);
  const at = s.th.indexOf(s.word);
  return (
    <main className="screen">
      <TopBar title="เปลี่ยนคำในประโยค" back="#/teach" />
      <p className="word-card">
        {s.th.slice(0, at)}<mark>{s.word}</mark>{s.th.slice(at + s.word.length)}
        <button className="speak" onClick={async () => setNoVoice((await speakTextThai(s.th)) === 'no-voice')}>🔊</button>
      </p>
      {noVoice && <p className="warn small">{NO_VOICE_TH}</p>}
      <p>พิมพ์ประโยคเดิม แต่เปลี่ยนคำที่ไฮไลต์เป็นคำเมือง:</p>
      <textarea rows={2} value={km} onChange={(e) => setKm(e.target.value)} />
      <label>คำเมืองที่ใช้แทน “{s.word}”: <input value={kmWord} onChange={(e) => setKmWord(e.target.value)} /></label>
      <div className="row">
        <button className="primary" disabled={!kmWord.trim() || km.trim() === s.th} onClick={async () => {
          await (await db()).put('km_pairs', { id: uid(), mode: 'swap', km: km.trim(), th: s.th, wordPair: { km: kmWord.trim(), th: s.word }, at: Date.now() });
          await addToDict(kmWord, s.word, 'swap');
          setI(i + 1);
        }}>บันทึก</button>
        <button onClick={() => setI(i + 1)}>ข้าม</button>
      </div>
    </main>
  );
}

function HelperMode() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [km, setKm] = useState('');
  const [th, setTh] = useState('');
  const [n, setN] = useState(0);
  useEffect(() => { getSetting('helperConsent', false).then(setOk); }, []);
  if (ok === null) return null;
  if (!ok)
    return (
      <main className="screen">
        <TopBar title="ลูกช่วยแปล" back="#/teach" />
        <ul className="consent">
          <li>ผู้ช่วยแปล (ลูก) อายุต่ำกว่า 18 ปี คุณในฐานะผู้ปกครองยินยอมให้ลูกช่วยพิมพ์คำแปล</li>
          <li>เก็บเฉพาะข้อความ ไม่เก็บชื่อ ไม่อัดเสียง ทุกอย่างอยู่ในเครื่องนี้</li>
          <li>คุณหรือลูกลบข้อมูลได้ทุกเมื่อที่ 📖 พจนานุกรมของฉัน หรือ ⚙️ ตั้งค่า</li>
        </ul>
        <button className="primary big-btn" onClick={async () => {
          await (await db()).put('consents', { id: uid(), kind: 'helper_minor', lang: 'th', agreed: true, textVersion: HELPER_CONSENT, at: Date.now() });
          await setSetting('helperConsent', true);
          setOk(true);
        }}>ฉันเป็นผู้ปกครองและยินยอม</button>
      </main>
    );
  return (
    <main className="screen">
      <TopBar title="ลูกช่วยแปล" back="#/teach" />
      <label>1. แม่พิมพ์ประโยคคำเมือง<textarea rows={2} value={km} onChange={(e) => setKm(e.target.value)} /></label>
      <label>2. ลูกพิมพ์เป็นภาษาไทยกลาง<textarea rows={2} value={th} onChange={(e) => setTh(e.target.value)} /></label>
      <button className="primary" disabled={!km.trim() || !th.trim()} onClick={async () => {
        await (await db()).put('km_pairs', { id: uid(), mode: 'helper', km: km.trim(), th: th.trim(), at: Date.now() });
        // Single words can go straight into the dictionary; sentences are kept as pairs only (not aligned).
        if (!/\s/.test(km.trim()) && !/\s/.test(th.trim())) await addToDict(km, th, 'helper');
        setKm(''); setTh(''); setN(n + 1);
      }}>บันทึก</button>
      {n > 0 && <p className="muted">บันทึกแล้ว {n} คู่</p>}
    </main>
  );
}

function DictView() {
  const [entries, setEntries] = useState<KmDictEntry[]>([]);
  const [pairs, setPairs] = useState(0);
  const reload = async () => {
    const d = await db();
    setEntries((await d.getAll('km_dictionary')).sort((a, b) => b.at - a.at));
    setPairs((await d.count('km_pairs')));
  };
  useEffect(() => { reload(); }, []);
  return (
    <main className="screen">
      <TopBar title="พจนานุกรมของฉัน" back="#/teach" />
      <p className="muted">{entries.length} คำ · {pairs} คู่ที่สอนไว้</p>
      {entries.map((e) => (
        <div key={e.km} className="row dict-row">
          <strong>{e.km}</strong> → 
          <input defaultValue={e.th} onBlur={async (ev) => {
            if (ev.target.value.trim() && ev.target.value !== e.th) { await addToDict(e.km, ev.target.value, 'correction'); reload(); }
          }} />
          <button className="link" onClick={async () => { await (await db()).delete('km_dictionary', e.km); reload(); }}>ลบ</button>
        </div>
      ))}
    </main>
  );
}
