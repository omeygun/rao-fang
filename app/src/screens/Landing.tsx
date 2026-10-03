// English landing page, shown when the app is opened in a normal browser tab (not the installed app).
import { useEffect, useState } from 'react';
import { ArrowRight, Download, Mic, PlaneTakeoff, ShieldCheck, Sparkles, Volume2 } from 'lucide-react';
import { loadDemo } from '../demo';
import { go } from '../nav';

type InstallEvent = Event & { prompt: () => Promise<void> };

export function Landing() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent); };
    addEventListener('beforeinstallprompt', on);
    return () => removeEventListener('beforeinstallprompt', on);
  }, []);
  return (
    <main className="landing">
      <nav>
        <div className="brandmark"><img src="/icon-192.png" alt="" /><b>Rao Fang · เราฟัง</b></div>
        <button className="ghost" onClick={() => go('/')}>Open app <ArrowRight aria-hidden /></button>
      </nav>

      <header className="hero">
        <span className="eyebrow reveal"><PlaneTakeoff aria-hidden /> Works in airplane mode</span>
        <h1 className="reveal">Your guests' voice, <em>in your language.</em></h1>
        <p className="reveal">
          A farm-tour host in northern Thailand can't read the English, Chinese or Korean feedback her visitors leave.
          Rao Fang listens to guests on the phone, sorts what they say with on-device AI, and tells her in Thai what to
          keep and what to fix — no internet, no cloud, nothing leaves the phone.
        </p>
        <div className="ctas reveal">
          <button className="primary" onClick={async () => { await loadDemo(); go('/insights'); }}><Sparkles aria-hidden /> Try the demo</button>
          {install
            ? <button onClick={() => install.prompt()}><Download aria-hidden /> Install app</button>
            : <button onClick={() => go('/')}>Open the app</button>}
        </div>
      </header>

      <section>
        <h2>How it works</h2>
        <h3>One loop, entirely on the phone</h3>
        <div className="steps stagger">
          <div className="step"><span className="n">1</span><div><b><Mic aria-hidden /> A guest speaks or types</b><p className="muted">In English, 中文 or 한국어 — speech is transcribed on the phone and the audio is discarded.</p></div></div>
          <div className="step"><span className="n">2</span><div><b><Sparkles aria-hidden /> The phone sorts it</b><p className="muted">A small model distilled from Claude finds what the guest talked about and how they felt. When it isn't sure, it asks a person instead of guessing.</p></div></div>
          <div className="step"><span className="n">3</span><div><b><Volume2 aria-hidden /> Noor hears it in Thai</b><p className="muted">“5 guests liked the coffee tasting” — fixed Thai sentences built from real counts and real quotes, read aloud. No generated text.</p></div></div>
        </div>
      </section>

      <section>
        <h2>Evidence</h2>
        <h3>Measured, not claimed</h3>
        <div className="stats stagger">
          <div className="stat"><b>69%</b><span>of feedback sorted automatically on the phone — the rest goes to a person</span><br /><a href="https://github.com/omeygun/rao-fang/blob/main/docs/eval.md">synthetic dev split, n=275</a></div>
          <div className="stat"><b>91%</b><span>precise when it does sort on its own</span><br /><a href="https://github.com/omeygun/rao-fang/blob/main/docs/eval.md">synthetic dev split, n=275</a></div>
          <div className="stat"><b>197 MB</b><span>one-time download, then fully offline</span><br /><a href="https://github.com/omeygun/rao-fang/blob/main/docs/benchmarks.md">measured in Cache Storage</a></div>
          <div className="stat"><b>0.99+</b><span>phone model matches the full model (cosine, 4 languages)</span><br /><a href="https://github.com/omeygun/rao-fang/blob/main/docs/benchmarks.md">parity check</a></div>
          <div className="stat"><b>7.7 s</b><span>to transcribe 11 s of speech, CPU throttled 4×</span><br /><a href="https://github.com/omeygun/rao-fang/blob/main/docs/benchmarks.md">emulated phone</a></div>
        </div>
        <p className="fineprint">Quality numbers come from Claude-written test data; a human-written test set and real-phone numbers are still in progress. Kham Mueang (Northern Thai) is supported only through the host's own taught dictionary — no AI model supports it.</p>
      </section>

      <section>
        <h2>Guardrails</h2>
        <h3><ShieldCheck aria-hidden /> Suggestions only. She decides.</h3>
        <p className="muted">Consent screens for guests and family, no names collected, everything stored on the phone, one-tap delete, and a “not sure — ask a person” queue whenever the model's confidence is low.</p>
      </section>
    </main>
  );
}
