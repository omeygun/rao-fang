// Embedding parity check (spec §8.2): the same 5 sentences embedded in Python
// (ml/train_student.py → public/models/parity.json) and here with transformers.js.
// Pass = cosine > 0.99 for every sentence.
import { useState } from 'react';
import { TopBar } from '../components/TopBar';
import { embedPrefixed, loadEmbedder } from '../ml/embed';
import { dot } from '../ml/heads';

interface ParityFile { prefix: string; sentences: string[]; inputs: string[]; embeddings: number[][]; encoder: string }

export function DevParity() {
  const [rows, setRows] = useState<{ s: string; cos: number }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setErr(null);
    try {
      const r = await fetch('/models/parity.json');
      if (!r.ok) throw new Error('public/models/parity.json not found — run ml/train_student.py first');
      const p: ParityFile = await r.json();
      await loadEmbedder();
      const js = await embedPrefixed(p.inputs);
      setRows(p.inputs.map((s, i) => {
        const py = p.embeddings[i];
        const n = Math.sqrt(dot(py, py)) * Math.sqrt(dot(js[i], js[i]));
        return { s, cos: dot(py, js[i]) / n };
      }));
    } catch (e) {
      setErr(String(e));
    }
  };
  const pass = rows?.every((r) => r.cos > 0.99);
  return (
    <main className="screen dev">
      <TopBar title="DevParity (e5 Python ↔ JS)" back="#/settings" />
      <button onClick={run}>Run parity check</button>
      {err && <p className="warn">{err}</p>}
      {rows && (
        <>
          <h3>{pass ? '✅ PASS' : '❌ FAIL'} (threshold cosine &gt; 0.99)</h3>
          <table className="small"><tbody>{rows.map((r) => <tr key={r.s}><td>{r.s}</td><td>{r.cos.toFixed(5)}</td></tr>)}</tbody></table>
        </>
      )}
    </main>
  );
}
