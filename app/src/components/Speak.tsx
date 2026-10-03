import { useState } from 'react';
import type { Frag } from '../config/thai_templates';
import { speakThai } from '../audio/speak';

export const NO_VOICE_TH = 'เครื่องนี้ไม่มีเสียงภาษาไทย: ไปที่ การตั้งค่า › ระบบ › ภาษาและการป้อนข้อมูล › เอาต์พุตการอ่านออกเสียง › ติดตั้งข้อมูลเสียง › ภาษาไทย';

export function SpeakButton({ frags, label = '🔊' }: { frags: Frag[]; label?: string }) {
  const [noVoice, setNoVoice] = useState(false);
  return (
    <>
      <button
        className="speak"
        aria-label="ฟังเสียง"
        onClick={async (e) => {
          e.stopPropagation();
          setNoVoice((await speakThai(frags)) === 'no-voice');
        }}
      >
        {label}
      </button>
      {noVoice && <p className="warn small">{NO_VOICE_TH}</p>}
    </>
  );
}
