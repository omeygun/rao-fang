// Noor's notes in Kham Mueang (spec §6.5): normalised to Central Thai with the personal
// dictionary; unknown words get a "สอนคำนี้" (teach this word) button → Word mode prefilled.
import { useEffect, useMemo, useState } from 'react';
import type { Aspect } from '../config/aspects';
import { db, uid } from '../db/db';
import { knownThaiWords, loadKmDict } from '../ml/kmDict';
import { normalizeKm } from '../ml/kmNormalize';
import { go } from '../nav';

export function NoteEditor({ aspect, onSaved }: { aspect?: Aspect; onSaved: () => void }) {
  const [text, setText] = useState(() => sessionStorage.getItem('raofang.noteDraft') ?? '');
  const [dict, setDict] = useState<Map<string, string>>(new Map());
  useEffect(() => { loadKmDict().then(setDict); }, []);
  useEffect(() => { sessionStorage.setItem('raofang.noteDraft', text); }, [text]);
  const known = useMemo(() => knownThaiWords(dict), [dict]);
  const r = useMemo(() => normalizeKm(text, dict, known), [text, dict, known]);

  return (
    <div className="note-editor">
      <textarea rows={2} value={text} placeholder="เขียนบันทึกเป็นภาษาเมืองหรือภาษาไทย…" onChange={(e) => setText(e.target.value)} />
      {text.trim() && (
        <>
          <p className="norm">
            {r.tokens.map((t, i) =>
              t.kind === 'km' ? <mark key={i} className="km" title={t.text}>{t.th}</mark>
              : t.kind === 'unknown' ? <mark key={i} className="unknown">{t.text}</mark>
              : <span key={i}>{t.text}</span>)}
          </p>
          <p className="muted small">ภาษาไทยกลาง (แปลงด้วยพจนานุกรมของคุณ){r.unknown.length > 0 && ' · คำที่ขีดสีแดง: ยังไม่รู้จัก'}</p>
          {r.unknown.map((u) => (
            <button key={u} className="chip teach" onClick={() => go('/teach/word?km=' + encodeURIComponent(u) + '&return=' + encodeURIComponent(location.hash.slice(1)))}>
              🗣️ สอนคำนี้: {u}
            </button>
          ))}
          <div className="row">
            <button className="primary" onClick={async () => {
              await (await db()).put('notes', { id: uid(), aspect, km: text.trim(), normalized: r.normalized.trim(), at: Date.now() });
              setText('');
              sessionStorage.removeItem('raofang.noteDraft');
              onSaved();
            }}>บันทึก</button>
          </div>
        </>
      )}
    </div>
  );
}
