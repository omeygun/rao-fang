// Guest Mode (spec §6.2): language → consent → photo ratings → open question → thanks.
import { useEffect, useRef, useState } from 'react';
import { GUEST_LANGS, TOUR_STEPS, type GuestLang } from '../config/aspects';
import { db, getSetting, uid, type FeedbackRec } from '../db/db';
import { G, GUEST_CONSENT_VERSION } from '../i18n/guest';
import { asrModel, decodeTo16k, transcribe } from '../ml/asr';
import { modelCached } from '../ml/status';
import { processPending } from '../ml/process';
import { go } from '../nav';

type Step = 'lang' | 'consent' | 'rate' | 'open' | 'thanks';

export function Guest() {
  const [step, setStep] = useState<Step>('lang');
  const [lang, setLang] = useState<GuestLang>('en');
  const [visitId, setVisitId] = useState<string | null>(null);
  const t = G[lang];

  if (step === 'lang')
    return (
      <main className="screen center guest">
        <h1>🌏</h1>
        {GUEST_LANGS.map((l) => (
          <button key={l} className="big-lang" onClick={() => { setLang(l); setStep('consent'); }}>{G[l].langName}</button>
        ))}
        <a className="muted" href="#/">←</a>
      </main>
    );

  if (step === 'consent')
    return (
      <main className="screen guest" lang={lang}>
        <h1>{t.consentTitle}</h1>
        <ul className="consent">{t.consentBody.map((p, i) => <li key={i}>{p}</li>)}</ul>
        <div className="row stack">
          <button className="primary big-btn" onClick={async () => {
            const d = await db();
            const consentId = uid(), vid = uid(), at = Date.now();
            await d.put('consents', { id: consentId, kind: 'guest', lang, agreed: true, textVersion: GUEST_CONSENT_VERSION, at });
            await d.put('visits', { id: vid, at, lang, consentId });
            setVisitId(vid);
            setStep('rate');
          }}>{t.agree}</button>
          <button className="big-btn" onClick={async () => {
            await (await db()).put('consents', { id: uid(), kind: 'guest', lang, agreed: false, textVersion: GUEST_CONSENT_VERSION, at: Date.now() });
            go('/');
          }}>{t.skip}</button>
        </div>
      </main>
    );

  if (step === 'rate') return <Ratings lang={lang} visitId={visitId!} onDone={() => setStep('open')} />;
  if (step === 'open') return <OpenQuestion lang={lang} visitId={visitId!} onDone={() => setStep('thanks')} />;
  return (
    <main className="screen center guest" lang={lang}>
      <h1>🙏 {t.thanks}</h1>
      <p>{t.thanksBody}</p>
      <button className="primary big-btn" onClick={() => go('/')}>{t.done}</button>
    </main>
  );
}

function Ratings({ lang, visitId, onDone }: { lang: GuestLang; visitId: string; onDone: () => void }) {
  const t = G[lang];
  const [i, setI] = useState(0);
  const s = TOUR_STEPS[i];
  const next = () => (i + 1 < TOUR_STEPS.length ? setI(i + 1) : onDone());
  const rate = async (value: 'up' | 'down') => {
    await (await db()).put('ratings', { id: uid(), visitId, stepId: s.id, aspect: s.aspect, value, at: Date.now() });
    next();
  };
  return (
    <main className="screen guest" lang={lang}>
      <h1>{t.rateTitle}</h1>
      <p className="muted">{t.rateHint} ({i + 1}/{TOUR_STEPS.length})</p>
      <figure className="photo-card">
        <img src={s.photo} alt={t.steps[s.id]} />
        <figcaption>{t.steps[s.id]}</figcaption>
      </figure>
      <div className="row rate">
        <button className="thumb" onClick={() => rate('up')} aria-label="👍">👍</button>
        <button className="thumb" onClick={() => rate('down')} aria-label="👎">👎</button>
      </div>
      <button className="link" onClick={next}>{t.skipStep} →</button>
    </main>
  );
}

function OpenQuestion({ lang, visitId, onDone }: { lang: GuestLang; visitId: string; onDone: () => void }) {
  const t = G[lang];
  const [text, setText] = useState('');
  const [asrText, setAsrText] = useState<string | undefined>();
  const [voiceOk, setVoiceOk] = useState<boolean | null>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    (async () => {
      const langs = await getSetting<string[]>('voiceLangs', ['en', 'zh', 'ko']);
      const hasMic = !!navigator.mediaDevices?.getUserMedia && 'MediaRecorder' in globalThis;
      setVoiceOk(hasMic && langs.includes(lang) && (navigator.onLine || (await modelCached(asrModel()))));
    })();
  }, [lang]);

  const start = async () => {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setBusy(true);
        try {
          const samples = await decodeTo16k(new Blob(chunks.current, { type: r.mimeType }));
          chunks.current = []; // audio is discarded after transcription
          const out = await transcribe(samples, lang);
          setAsrText(out);
          setText((prev) => (prev ? prev + ' ' : '') + out);
        } catch (e) {
          setErr(t.voiceUnavailable);
          console.error(e);
        } finally {
          setBusy(false);
        }
      };
      r.start();
      setRec(r);
    } catch {
      setErr(t.voiceUnavailable);
    }
  };
  const stop = () => {
    rec?.stop();
    setRec(null);
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (trimmed) {
      const f: FeedbackRec = {
        id: uid(), visitId, at: Date.now(), lang, text: trimmed,
        inputMode: asrText !== undefined ? 'voice' : 'text', asrTranscript: asrText,
        status: 'pending', unsure: false, unsureReasons: [],
      };
      await (await db()).put('feedback', f);
      processPending(); // background; not awaited
    }
    onDone();
  };

  return (
    <main className="screen guest" lang={lang}>
      <h1>{t.openTitle}</h1>
      <p className="muted">{t.openHint}</p>
      {voiceOk && (
        <div className="row">
          {rec ? <button className="rec on" onClick={stop}>{t.stop}</button> : <button className="rec" disabled={busy} onClick={start}>{t.record}</button>}
        </div>
      )}
      {voiceOk === false && <p className="muted small">{t.voiceUnavailable}</p>}
      {busy && <p className="spinner">⏳ {t.transcribing}</p>}
      {err && <p className="warn">{err}</p>}
      {asrText !== undefined && <p className="muted small">{t.editHint}</p>}
      <textarea rows={6} value={text} placeholder={t.placeholder} onChange={(e) => setText(e.target.value)} />
      <button className="primary big-btn" disabled={busy || !!rec} onClick={submit}>{t.submit}</button>
    </main>
  );
}
