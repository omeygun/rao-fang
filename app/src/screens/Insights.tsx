// Insights for Noor (spec §6.4). Counts + fixed Thai templates + real quotes only.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ASPECT_INFO, SENTIMENT_TH, type Aspect } from '../config/aspects';
import { renderThai, T, type Frag } from '../config/thai_templates';
import { db, type FeedbackRec, type NoteRec, type RatingRec, type VisitRec } from '../db/db';
import { buildInsights, type Evidence, type Period } from '../insights/engine';
import { loadHeads, thresholdsFrom } from '../ml/classify';
import { packInstalled, translateToThai } from '../ml/translate';
import { REASON_TH } from '../ml/uncertainty';
import { SpeakButton } from '../components/Speak';
import { DecideFooter } from '../components/Footer';
import { TopBar } from '../components/TopBar';
import { AspectPicker } from '../components/AspectPicker';
import { NoteEditor } from '../components/NoteEditor';
import { G } from '../i18n/guest';

const PERIODS: [Period, string][] = [['week', 'สัปดาห์นี้'], ['month', 'เดือนนี้'], ['all', 'ทั้งหมด']];

export function Insights() {
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<{ visits: VisitRec[]; ratings: RatingRec[]; feedback: FeedbackRec[]; notes: NoteRec[] } | null>(null);
  const [th, setTh] = useState(thresholdsFrom(null));
  const [open, setOpen] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const d = await db();
    setData({ visits: await d.getAll('visits'), ratings: await d.getAll('ratings'), feedback: await d.getAll('feedback'), notes: await d.getAll('notes') });
  }, []);
  useEffect(() => {
    loadHeads().then((h) => setTh(thresholdsFrom(h)));
    reload();
  }, [reload]);
  const pending = data?.feedback.some((f) => f.status === 'pending');
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(reload, 2000);
    return () => clearInterval(id);
  }, [pending, reload]);

  const ins = useMemo(() => (data ? buildInsights(data, period, th) : null), [data, period, th]);
  const byId = useMemo(() => new Map(data?.feedback.map((f) => [f.id, f]) ?? []), [data]);
  if (!ins || !data) return <main className="screen"><TopBar title="ดูสรุป" /></main>;

  const empty = ins.cards.length === 0 && ins.unsure.length === 0 && ins.buy.n === 0;
  return (
    <main className="screen insights">
      <TopBar title="ดูสรุป" />
      <div className="segmented">
        {PERIODS.map(([p, label]) => (
          <button key={p} className={p === period ? 'on' : ''} onClick={() => setPeriod(p)}>{label}</button>
        ))}
      </div>
      <p className="muted">แขก {ins.guests} คน {pending && '· ⏳ กำลังประมวลผล…'}</p>
      {empty && (
        <section className="card empty">
          <p className="icon">🌱</p>
          <p className="sentence">{renderThai(T.noData())}</p>
          <a className="chip on" href="#/guest">🧳 ให้แขกรีวิว</a>
        </section>
      )}

      {ins.buy.n > 0 && (
        <Card icon="🛍️" title="แขกอยากซื้อ" frags={ins.buy.sentence} weak={ins.buy.weak} onTap={() => setOpen(open === 'buy' ? null : 'buy')}>
          {open === 'buy' && <Drawer evidence={ins.buy.evidence} byId={byId} onChanged={reload} />}
        </Card>
      )}
      {ins.suggestions.n > 0 && (
        <Card icon="💡" title="ข้อเสนอแนะ" frags={ins.suggestions.sentence} onTap={() => setOpen(open === 'sug' ? null : 'sug')}>
          {open === 'sug' && <Drawer evidence={ins.suggestions.evidence} byId={byId} onChanged={reload} />}
        </Card>
      )}

      {ins.cards.map((c) => (
        <Card key={c.aspect} icon={ASPECT_INFO[c.aspect].icon} title={ASPECT_INFO[c.aspect].th} frags={c.sentence} weak={c.weak}
          counts={{ up: c.up, down: c.down }} onTap={() => setOpen(open === c.aspect ? null : c.aspect)}>
          {open === c.aspect && (
            <>
              <Drawer evidence={c.evidence} byId={byId} onChanged={reload} />
              <Notes aspect={c.aspect} notes={data.notes} onChanged={reload} />
            </>
          )}
        </Card>
      ))}

      {ins.unsure.length > 0 ? (
        <section className="card unsure">
          <div className="card-head">
            <span className="icon">❓</span>
            <h2>ไม่แน่ใจ — ให้คนช่วยดู</h2>
            <SpeakButton frags={ins.unsureSentence} />
          </div>
          <p className="sentence">{renderThai(ins.unsureSentence)}</p>
          {ins.unsure.map((f) => <UnsureItem key={f.id} f={f} onChanged={reload} />)}
        </section>
      ) : (
        !empty && <p className="muted small">✅ ไม่มีความเห็นที่ต้องให้คนช่วยดู</p>
      )}
    </main>
  );
}

function Card({ icon, title, frags, weak, counts, onTap, children }: {
  icon: string; title: string; frags: Frag[]; weak?: boolean; counts?: { up: number; down: number };
  onTap?: () => void; children?: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-head" onClick={onTap}>
        <span className="icon" aria-hidden>{icon}</span>
        <h2>{title}</h2>
        <SpeakButton frags={frags} />
      </div>
      <p className="sentence" onClick={onTap}>{renderThai(frags)}</p>
      {counts && <p className="counts">👍 {counts.up} · 👎 {counts.down}</p>}
      {weak && (
        <p className="badge weak">⚠️ {renderThai(T.weakEvidence())} <SpeakButton frags={T.weakEvidence()} /></p>
      )}
      {onTap && <button className="link" aria-expanded={!!children} onClick={onTap}>ดูความเห็นจริง ›</button>}
      {children}
      <DecideFooter />
    </section>
  );
}

function Drawer({ evidence, byId, onChanged }: { evidence: Evidence[]; byId: Map<string, FeedbackRec>; onChanged: () => void }) {
  const [pack, setPack] = useState<boolean | null>(null);
  useEffect(() => { packInstalled().then(setPack); }, []);
  const seen = new Set<string>();
  const items = evidence.filter((e) => !seen.has(e.feedbackId) && seen.add(e.feedbackId));
  if (!items.length) return <p className="muted small">มีแต่คะแนนจากรูปภาพ ไม่มีข้อความ</p>;
  return (
    <div className="drawer">
      {pack === false && <p className="muted small">ℹ️ ยังไม่ได้ติดตั้งชุดแปลภาษา จึงแสดงข้อความต้นฉบับพร้อมหัวข้อภาษาไทย (ติดตั้งได้ที่ ⚙️ ตั้งค่า)</p>}
      {items.map((e) => {
        const f = byId.get(e.feedbackId);
        return f ? <Quote key={f.id} f={f} ev={e} pack={!!pack} onChanged={onChanged} /> : null;
      })}
    </div>
  );
}

function Quote({ f, ev, pack, onChanged }: { f: FeedbackRec; ev: Evidence; pack: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!pack || f.thaiTranslation || busy) return;
    setBusy(true);
    translateToThai(f.text, f.lang)
      .then(async (tr) => {
        if (tr) {
          await (await db()).put('feedback', { ...f, thaiTranslation: tr });
          onChanged();
        }
      })
      .catch(() => setErr(true))
      .finally(() => setBusy(false));
  }, [pack, f.id]);
  const labels = (f.humanLabels?.aspects ?? f.model?.aspects ?? []).map((a) => `${ASPECT_INFO[a.aspect].icon} ${ASPECT_INFO[a.aspect].th}${a.sentiment ? ' (' + SENTIMENT_TH[a.sentiment] + ')' : ''}`);
  return (
    <blockquote className="quote">
      <p className="orig" lang={f.lang}>“{f.text}”</p>
      <p className="muted small">{G[f.lang].langName} · {new Date(f.at).toLocaleDateString('th-TH')} · {ev.source === 'human' ? '✋ คนติดป้าย' : '🤖 เครื่องจัดหมวด'}</p>
      {f.thaiTranslation && <p className="thai">🇹🇭 {f.thaiTranslation} <span className="badge mt">แปลโดยเครื่อง</span></p>}
      {busy && <p className="spinner small">⏳ กำลังแปล…</p>}
      {err && <p className="warn small">แปลไม่สำเร็จ ดูข้อความต้นฉบับแทน</p>}
      <p className="small">{labels.join(' · ')}</p>
    </blockquote>
  );
}

function UnsureItem({ f, onChanged }: { f: FeedbackRec; onChanged: () => void }) {
  const [tagging, setTagging] = useState(false);
  return (
    <div className="quote">
      <p className="orig" lang={f.lang}>“{f.text}”</p>
      <p className="muted small">{G[f.lang].langName} · {f.unsureReasons.map((r) => REASON_TH[r] ?? r).join(', ')}</p>
      {f.model && f.model.aspects.length > 0 && (
        <p className="small">🤖 อาจเป็น: {f.model.aspects.slice(0, 3).map((a) => `${ASPECT_INFO[a.aspect].icon} ${ASPECT_INFO[a.aspect].th} ${(a.p * 100).toFixed(0)}%`).join(' · ')}</p>
      )}
      {tagging ? (
        <AspectPicker onCancel={() => setTagging(false)} onSave={async (humanLabels) => {
          await (await db()).put('feedback', { ...f, humanLabels });
          setTagging(false);
          onChanged();
        }} />
      ) : (
        <button onClick={() => setTagging(true)}>🏷️ ติดป้ายเอง</button>
      )}
    </div>
  );
}

function Notes({ aspect, notes, onChanged }: { aspect: Aspect; notes: NoteRec[]; onChanged: () => void }) {
  const mine = notes.filter((n) => n.aspect === aspect).sort((a, b) => b.at - a.at);
  return (
    <div className="notes">
      <h3>📝 บันทึกของฉัน</h3>
      {mine.map((n) => (
        <div key={n.id} className="note">
          <p>{n.km}</p>
          {n.normalized !== n.km && <p className="muted small">→ {n.normalized}</p>}
          <button className="link small" onClick={async () => { await (await db()).delete('notes', n.id); onChanged(); }}>ลบ</button>
        </div>
      ))}
      <NoteEditor aspect={aspect} onSaved={onChanged} />
    </div>
  );
}
