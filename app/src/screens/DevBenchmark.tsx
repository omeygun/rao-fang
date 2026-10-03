// Phase 0 device benchmark (spec §4, §16.1). Run on the phone over the HTTPS URL,
// first online to download models, then again in airplane mode for the real numbers.
// "Copy as Markdown" output goes into docs/benchmarks.md. Nothing here is faked:
// every number shown is measured on the device that runs this page.
import { useEffect, useRef, useState } from 'react';
import { TopBar } from '../components/TopBar';
import { MODELS, wasmThreads, webgpuAvailable, pickDevice, type Progress } from '../ml/env';
import { decodeTo16k, loadAsr, transcribe } from '../ml/asr';
import { e5Input, embedPrefixed, loadEmbedder } from '../ml/embed';
import { installPack, translateToThai } from '../ml/translate';
import { coreAndPack, mb, measureCaches, type CacheGroup } from '../ml/cacheInfo';
import { offlineFetches } from '../dev/offlineFetchLog';
import { requestPersist } from '../storage';

const SENTENCE_30 =
  'We really enjoyed walking through the coffee farm this morning, and the tasting at the end was the best part, but the trail was a bit too steep for my parents.';
const READ_ALOUD =
  'Please read this aloud for ten seconds: The coffee tour was lovely. Our host explained every step clearly, and I would like to buy two bags of roasted beans to take home.';

interface Row { name: string; ms?: number; note: string }

function env() {
  const ua = navigator.userAgent;
  const android = ua.match(/Android ([\d.]+)/)?.[1] ?? 'n/a';
  const chrome = ua.match(/Chrome\/([\d.]+)/)?.[1] ?? 'n/a';
  const model = ua.match(/Android [\d.]+; ([^)]+)\)/)?.[1] ?? 'n/a';
  return { ua, android, chrome, model };
}
function memMB(): string {
  const m = (performance as any).memory;
  return m ? `${(m.usedJSHeapSize / 1048576).toFixed(0)} MB used / ${(m.jsHeapSizeLimit / 1048576).toFixed(0)} MB limit (JS heap only)` : 'performance.memory not available';
}

export function DevBenchmark() {
  const [gpu, setGpu] = useState<boolean | null>(null);
  const [device, setDevice] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState('');
  const [audio, setAudio] = useState<Float32Array | null>(null);
  const [groups, setGroups] = useState<CacheGroup[]>([]);
  const [peak, setPeak] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    webgpuAvailable().then(setGpu);
    pickDevice().then(setDevice);
    measureCaches().then(setGroups);
    const id = setInterval(() => {
      const m = (performance as any).memory;
      if (m) setPeak((p) => Math.max(p, m.usedJSHeapSize));
    }, 250);
    return () => clearInterval(id);
  }, []);

  const add = (r: Row) => setRows((rs) => [...rs.filter((x) => x.name !== r.name), r]);
  const prog: Progress = (p) => setStatus(`${p.status} ${p.file ?? ''} ${p.total ? Math.round(((p.loaded ?? 0) / p.total) * 100) + '%' : ''}`);
  const time = async (name: string, f: () => Promise<string>) => {
    setStatus('running ' + name);
    const t0 = performance.now();
    try {
      const note = await f();
      add({ name, ms: performance.now() - t0, note });
    } catch (e) {
      add({ name, note: '❌ ' + String(e) });
    }
    setStatus('');
    setGroups(await measureCaches());
  };

  const record10s = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setAudio(await decodeTo16k(new Blob(chunks, { type: r.mimeType })));
    };
    recRef.current = r;
    r.start();
    setStatus('recording 10 s…');
    setTimeout(() => { r.stop(); setStatus(''); }, 10_000);
  };

  const e = env();
  const { core, pack } = coreAndPack(groups);
  const md = [
    `| Field | Value |`, `|---|---|`,
    `| Date | ${new Date().toISOString()} |`,
    `| Device (UA) | ${e.model} |`, `| Android | ${e.android} |`, `| Chrome | ${e.chrome} |`,
    `| Online at run time | ${navigator.onLine} |`,
    `| crossOriginIsolated | ${globalThis.crossOriginIsolated} |`,
    `| hardwareConcurrency | ${navigator.hardwareConcurrency} |`,
    `| WASM threads used | ${wasmThreads()} |`,
    `| WebGPU adapter | ${gpu} |`, `| Inference device | ${device} |`,
    `| Peak JS heap | ${peak ? (peak / 1048576).toFixed(0) + ' MB' : 'n/a'} |`,
    ...rows.map((r) => `| ${r.name} | ${r.ms != null ? (r.ms / 1000).toFixed(2) + ' s' : '—'} ${r.note.replace(/\|/g, '/')} |`),
    `| Core bundle in Cache Storage | ${mb(core)} |`, `| Translation pack in Cache Storage | ${mb(pack)} |`,
    ...groups.map((g) => `| cache: ${g.name} | ${mb(g.bytes)} (${g.files} files) |`),
  ].join('\n');

  return (
    <main className="screen dev">
      <TopBar title="DevBenchmark (Phase 0)" back="#/settings" />
      <table className="small">
        <tbody>
          <tr><td>crossOriginIsolated</td><td>{String(globalThis.crossOriginIsolated)}</td></tr>
          <tr><td>hardwareConcurrency</td><td>{navigator.hardwareConcurrency}</td></tr>
          <tr><td>WASM threads used</td><td>{wasmThreads()}</td></tr>
          <tr><td>WebGPU adapter</td><td>{String(gpu)}</td></tr>
          <tr><td>Device used</td><td>{device} <button className="link" onClick={() => { localStorage.setItem('raofang.device', device === 'wasm' ? 'webgpu' : 'wasm'); location.reload(); }}>switch</button></td></tr>
          <tr><td>Online</td><td>{String(navigator.onLine)}</td></tr>
          <tr><td>Memory</td><td>{memMB()}</td></tr>
        </tbody>
      </table>

      <h3>1. Load models (online first time)</h3>
      <div className="row">
        <button onClick={() => time('load e5-small q8', async () => { await loadEmbedder(prog); requestPersist(); return MODELS.embed; })}>Load e5</button>
        <button onClick={() => time('load whisper-base q8', async () => { await loadAsr(prog, MODELS.asr); return MODELS.asr; })}>Load whisper-base</button>
        <button onClick={() => time('load whisper-tiny q8', async () => { await loadAsr(prog, MODELS.asrFallback); return MODELS.asrFallback; })}>Load whisper-tiny</button>
        <button onClick={() => time('load NLLB q8 (pack)', async () => { await installPack(prog); return MODELS.translate; })}>Load NLLB (big!)</button>
      </div>

      <h3>2. Timings (do these in airplane mode)</h3>
      <p className="small">{READ_ALOUD}</p>
      <div className="row">
        <button onClick={record10s}>🎙️ Record 10 s</button>
        <label className="small">or file: <input type="file" accept="audio/*" onChange={async (ev) => { const f = ev.target.files?.[0]; if (f) setAudio(await decodeTo16k(f)); }} /></label>
        {audio && <span className="small">audio: {(audio.length / 16000).toFixed(1)} s</span>}
      </div>
      <div className="row">
        <button disabled={!audio} onClick={() => time(`whisper-base: ${(audio!.length / 16000).toFixed(1)} s audio`, async () => { await loadAsr(undefined, MODELS.asr); return '→ ' + (await transcribe(audio!, 'en', MODELS.asr)); })}>Whisper base</button>
        <button disabled={!audio} onClick={() => time(`whisper-tiny: ${(audio!.length / 16000).toFixed(1)} s audio`, async () => { await loadAsr(undefined, MODELS.asrFallback); return '→ ' + (await transcribe(audio!, 'en', MODELS.asrFallback)); })}>Whisper tiny</button>
        <button onClick={() => time('e5-small: embed 30 words (warm)', async () => { await embedPrefixed([e5Input('warm up')]); const t = performance.now(); const [v] = await embedPrefixed([e5Input(SENTENCE_30)]); return `dim ${v.length}, inner ${(performance.now() - t).toFixed(0)} ms`; })}>e5 embed</button>
        <button onClick={() => time('NLLB: 30 words en→th', async () => (await translateToThai(SENTENCE_30, 'en')) ?? 'pack not installed')}>NLLB translate</button>
      </div>
      {status && <p className="spinner">⏳ {status}</p>}

      <h3>3. Results</h3>
      <table className="small">
        <tbody>{rows.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.ms != null ? (r.ms / 1000).toFixed(2) + ' s' : '—'}</td><td>{r.note}</td></tr>)}</tbody>
      </table>
      <p className="small">Core in Cache Storage: {mb(core)} · Translation pack: {mb(pack)}</p>
      <textarea readOnly rows={10} value={md} />
      <button onClick={() => navigator.clipboard.writeText(md)}>📋 Copy as Markdown</button>

      <h3>Offline fetch log ({offlineFetches.length})</h3>
      <ul className="small">{offlineFetches.map((f, i) => <li key={i}>{f.ok === false ? '❌' : f.ok ? '✅ (cache)' : '…'} {f.url}</li>)}</ul>
      <p className="small muted">UA: {e.ua}</p>
    </main>
  );
}
