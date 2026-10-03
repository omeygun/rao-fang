// Guest Mode (spec §6.2): language → consent → photo ratings → open question → thanks.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { ArrowLeft, Check, ChevronRight, Mic, Square, ThumbsDown, ThumbsUp } from 'lucide-react';
import { GUEST_LANGS, TOUR_STEPS, type GuestLang } from '../config/aspects';
import { db, getSetting, uid, type FeedbackRec } from '../db/db';
import { G, GUEST_CONSENT_VERSION } from '../i18n/guest';
import { asrModel, decodeTo16k, transcribe } from '../ml/asr';
import { modelCached } from '../ml/status';
import { processPending } from '../ml/process';
import { go } from '../nav';
import { haptic } from '../components/ui';

type Step = 'lang' | 'consent' | 'rate' | 'open' | 'thanks';
const ORDER: Step[] = ['consent', 'rate', 'open', 'thanks'];

function Stepper({ step }: { step: Step }) {
  const k = ORDER.indexOf(step);
  return <div className="stepper" aria-hidden>{ORDER.map((s, i) => <i key={s} className={i <= k ? 'done' : ''} />)}</div>;
}

export function Guest() {
  const [step, setStep] = useState<Step>('lang');
  const [lang, setLang] = useState<GuestLang>('en');
  const [visitId, setVisitId] = useState<string | null>(null);
  const t = G[lang];

  if (step === 'lang')
    return (
      <main className="screen guest">
        <a className="back muted" href="#/" aria-label="back" style={{ alignSelf: 'flex-start' }}><ArrowLeft aria-hidden /></a>
        <div className="center" style={{ marginTop: '12dvh' }}>
          <img src="/icon-192.png" alt="" width={72} height={72} style={{ borderRadius: 20, boxShadow: 'var(--shadow-2)' }} className="reveal" />
          <h1 className="reveal" style={{ fontSize: 'var(--t-xl)', lineHeight: 1.2 }}>Welcome<br /><span lang="zh">欢迎</span> · <span lang="ko">환영합니다</span></h1>
          <p className="muted reveal">Choose your language<br /><span lang="zh">选择语言</span> · <span lang="ko">언어를 선택하세요</span></p>
        </div>
        <div className="row stack stagger" style={{ marginTop: 24 }}>
          {GUEST_LANGS.map((l) => (
            <button key={l} className="big-lang" lang={l} onClick={() => { haptic(); setLang(l); setStep('consent'); }}>
              {G[l].langName} <ChevronRight aria-hidden />
            </button>
          ))}
        </div>
      </main>
    );

  if (step === 'consent')
    return (
      <main className="screen guest" lang={lang}>
        <Stepper step={step} />
        <h1>{t.consentTitle}</h1>
        <ul className="consent stagger">{t.consentBody.map((p, i) => <li key={i}><Check aria-hidden /> <span>{p}</span></li>)}</ul>
        <div className="row stack cta-bar">
          <button className="primary big-btn" onClick={async () => {
            haptic();
            const d = await db();
            const consentId = uid(), vid = uid(), at = Date.now();
            await d.put('consents', { id: consentId, kind: 'guest', lang, agreed: true, textVersion: GUEST_CONSENT_VERSION, at });
            await d.put('visits', { id: vid, at, lang, consentId });
            setVisitId(vid);
            setStep('rate');
          }}>{t.agree}</button>
          <button className="big-btn ghost" onClick={async () => {
            await (await db()).put('consents', { id: uid(), kind: 'guest', lang, agreed: false, textVersion: GUEST_CONSENT_VERSION, at: Date.now() });
            go('/');
          }}>{t.skip}</button>
        </div>
      </main>
    );

  if (step === 'rate') return <Ratings lang={lang} visitId={visitId!} onDone={() => setStep('open')} />;
  if (step === 'open') return <OpenQuestion lang={lang} visitId={visitId!} onDone={() => setStep('thanks')} />;
  return (
    <main className="screen guest center" lang={lang} style={{ justifyContent: 'center' }}>
      <Confetti />
      <p className="celebrate" aria-hidden>🙏</p>
      <h1 style={{ fontSize: 'var(--t-xl)' }}>{t.thanks}</h1>
      <p className="muted">{t.thanksBody}</p>
      <div className="cta-bar" style={{ width: '100%' }}>
        <button className="primary big-btn" onClick={() => go('/')}>{t.done}</button>
      </div>
    </main>
  );
}

/** A short, light confetti burst for the "peak-end" moment (skipped with reduced motion). */
function Confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const colors = ['#c0392b', '#0a8a7a', '#e8b04a', '#5b3a1e', '#e8574a'];
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <i key={i} style={{
          left: `${(i * 97) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 9) * 0.06}s`,
          ['--dx' as string]: `${((i * 37) % 120) - 60}px`, ['--rot' as string]: `${(i * 71) % 720}deg`,
        }} />
      ))}
    </div>
  );
}

function Ratings({ lang, visitId, onDone }: { lang: GuestLang; visitId: string; onDone: () => void }) {
  const t = G[lang];
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  const start = useRef<number | null>(null);
  const s = TOUR_STEPS[i], nextStep = TOUR_STEPS[i + 1];
  const advance = () => { setDx(0); setLeaving(0); busy.current = false; i + 1 < TOUR_STEPS.length ? setI(i + 1) : onDone(); };
  const busy = useRef(false); // one answer per card: ignore taps while the card flies away
  const rate = async (value: 'up' | 'down' | null) => {
    if (busy.current) return;
    busy.current = true;
    haptic(value ? 18 : 8);
    if (value) await (await db()).put('ratings', { id: uid(), visitId, stepId: s.id, aspect: s.aspect, value, at: Date.now() });
    setLeaving(value === 'down' ? -1 : value === 'up' ? 1 : 0);
    setTimeout(advance, value ? 280 : 0);
  };
  // Swipe: right = 👍, left = 👎 (buttons stay for accessibility).
  const down = (e: RPointerEvent) => { start.current = e.clientX; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const move = (e: RPointerEvent) => { if (start.current !== null) setDx(e.clientX - start.current); };
  const up = () => { if (start.current === null) return; start.current = null; Math.abs(dx) > 90 ? rate(dx > 0 ? 'up' : 'down') : setDx(0); };
  const x = leaving ? leaving * 480 : dx;
  return (
    <main className="screen guest" lang={lang}>
      <Stepper step="rate" />
      <h1>{t.rateTitle}</h1>
      <p className="muted small">{t.rateHint} · {i + 1}/{TOUR_STEPS.length}</p>
      <div className="swipe-stack">
        {nextStep && (
          <figure className="photo-card next" key={nextStep.id}><img src={nextStep.photo} alt="" /><figcaption>{t.steps[nextStep.id]}</figcaption></figure>
        )}
        <figure key={s.id} className={'photo-card' + (start.current === null ? ' fly-up' : '')}
          style={{ transform: `translateX(${x}px) rotate(${x / 18}deg)`, opacity: leaving ? 0 : 1 }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <img src={s.photo} alt={t.steps[s.id]} draggable={false} />
          <span className="stamp like" style={{ opacity: Math.max(0, Math.min(1, x / 90)) }}>👍</span>
          <span className="stamp nope" style={{ opacity: Math.max(0, Math.min(1, -x / 90)) }}>👎</span>
          <figcaption>{t.steps[s.id]}</figcaption>
        </figure>
      </div>
      <div className="row rate">
        <button className="thumb down" onClick={() => rate('down')} aria-label={t.dislike}><ThumbsDown aria-hidden color="var(--neg)" /></button>
        <button className="thumb up" onClick={() => rate('up')} aria-label={t.like}><ThumbsUp aria-hidden color="var(--pos)" /></button>
      </div>
      <button className="link" style={{ alignSelf: 'center' }} onClick={() => rate(null)}>{t.skipStep} →</button>
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
  const [levels, setLevels] = useState<number[]>(Array(24).fill(0.08));
  const [secs, setSecs] = useState(0);
  const [typing, setTyping] = useState(false);
  const chunks = useRef<Blob[]>([]);
  const stopViz = useRef<() => void>(() => {});

  useEffect(() => {
    (async () => {
      const langs = await getSetting<string[]>('voiceLangs', ['en', 'zh', 'ko']);
      const hasMic = !!navigator.mediaDevices?.getUserMedia && 'MediaRecorder' in globalThis;
      setVoiceOk(hasMic && langs.includes(lang) && (navigator.onLine || (await modelCached(asrModel()))));
    })();
    return () => stopViz.current();
  }, [lang]);

  // Live waveform + timer from the mic stream (Web Audio analyser); nothing is stored.
  const visualise = (stream: MediaStream) => {
    const ctx = new AudioContext(), an = ctx.createAnalyser();
    an.fftSize = 64;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.frequencyBinCount), t0 = Date.now();
    let raf = 0;
    const tick = () => {
      an.getByteFrequencyData(buf);
      setLevels(Array.from({ length: 24 }, (_, k) => Math.max(0.08, buf[k + 2] / 255)));
      setSecs(Math.floor((Date.now() - t0) / 1000));
      raf = requestAnimationFrame(tick);
    };
    tick();
    stopViz.current = () => { cancelAnimationFrame(raf); if (ctx.state !== 'closed') ctx.close(); setLevels(Array(24).fill(0.08)); };
  };

  const start = async () => {
    setErr(null);
    haptic(20);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stopViz.current();
        stream.getTracks().forEach((tr) => tr.stop());
        setBusy(true);
        try {
          const samples = await decodeTo16k(new Blob(chunks.current, { type: r.mimeType }));
          chunks.current = []; // audio is discarded after transcription
          const out = await transcribe(samples, lang);
          setAsrText(out);
          typeIn(out);
        } catch (e) {
          setErr(t.voiceUnavailable);
          console.error(e);
        } finally {
          setBusy(false);
        }
      };
      r.start();
      setSecs(0);
      visualise(stream);
      setRec(r);
    } catch {
      setErr(t.voiceUnavailable);
    }
  };
  const stop = () => { haptic(12); rec?.stop(); setRec(null); };

  // Transcript "types itself" into the box (instant with reduced motion).
  const typeIn = (out: string) => {
    const base = text ? text + ' ' : '';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setText(base + out);
    let k = 0;
    setTyping(true); // Send stays disabled until the whole transcript is in the box
    const id = setInterval(() => {
      k += 2;
      setText(base + out.slice(0, k));
      if (k >= out.length) { clearInterval(id); setTyping(false); }
    }, 16);
  };

  const submit = async () => {
    haptic(20);
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
      <Stepper step="open" />
      <h1>{t.openTitle}</h1>
      <p className="muted small">{t.openHint}</p>
      {voiceOk && (
        <div className="mic-wrap">
          <button className={'mic' + (rec ? ' on' : '')} disabled={busy} onClick={rec ? stop : start} aria-label={rec ? t.stop : t.record}>
            {rec ? <Square aria-hidden fill="#fff" /> : <Mic aria-hidden />}
          </button>
          {rec ? (
            <>
              <div className="wave" aria-hidden>{levels.map((v, k) => <i key={k} style={{ height: `${Math.round(v * 40)}px` }} />)}</div>
              <span className="timer">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')} · {t.stop}</span>
            </>
          ) : (
            <span className="small muted">{busy ? '' : t.record.replace('🎤 ', '')}</span>
          )}
        </div>
      )}
      {voiceOk === false && <p className="muted small">{t.voiceUnavailable}</p>}
      {busy && <p className="spinner small">⏳ {t.transcribing}</p>}
      {err && <p className="warn">{err}</p>}
      {asrText !== undefined && <p className="muted small">{t.editHint}</p>}
      <textarea rows={5} value={text} placeholder={t.placeholder} aria-label={t.openTitle} onChange={(e) => setText(e.target.value)} />
      <div className="cta-bar">
        <button className="primary big-btn" disabled={busy || typing || !!rec} onClick={submit}>{t.submit}</button>
      </div>
    </main>
  );
}
