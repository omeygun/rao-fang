// Manual tagging buttons for the "not sure" queue (spec §6.4). Labels stored as human labels.
import { useState } from 'react';
import { ASPECTS, ASPECT_INFO, SENTIMENT_TH, SENTIMENTS, type Aspect, type Sentiment } from '../config/aspects';
import type { HumanLabels } from '../db/db';

export function AspectPicker({ initial, onSave, onCancel }: {
  initial?: HumanLabels;
  onSave: (l: HumanLabels) => void;
  onCancel: () => void;
}) {
  const [sel, setSel] = useState<Map<Aspect, Sentiment | undefined>>(
    new Map((initial?.aspects ?? []).map((a) => [a.aspect, a.sentiment])),
  );
  const [sug, setSug] = useState(!!initial?.isSuggestion);
  const toggle = (a: Aspect) => {
    const m = new Map(sel);
    if (m.has(a)) m.delete(a);
    else m.set(a, 'positive');
    setSel(m);
  };
  return (
    <div className="picker">
      <p>เลือกเรื่องที่แขกพูดถึง:</p>
      <div className="chips">
        {ASPECTS.map((a) => (
          <button key={a} className={'chip' + (sel.has(a) ? ' on' : '')} onClick={() => toggle(a)}>
            {ASPECT_INFO[a].icon} {ASPECT_INFO[a].th}
          </button>
        ))}
      </div>
      {[...sel.keys()].map((a) => (
        <div key={a} className="row">
          <span>{ASPECT_INFO[a].icon}</span>
          {SENTIMENTS.map((s) => (
            <button key={s} className={'chip' + (sel.get(a) === s ? ' on' : '')} onClick={() => setSel(new Map(sel).set(a, s))}>
              {s === 'positive' ? '👍' : s === 'negative' ? '👎' : '👍👎'} {SENTIMENT_TH[s]}
            </button>
          ))}
        </div>
      ))}
      <label className="row"><input type="checkbox" checked={sug} onChange={(e) => setSug(e.target.checked)} /> 💡 เป็นข้อเสนอแนะ</label>
      <div className="row">
        <button className="primary" disabled={sel.size === 0} onClick={() => onSave({ aspects: [...sel].map(([aspect, sentiment]) => ({ aspect, sentiment })), isSuggestion: sug, at: Date.now() })}>
          บันทึก
        </button>
        <button onClick={onCancel}>ยกเลิก</button>
      </div>
    </div>
  );
}
