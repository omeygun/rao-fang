import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { Frag } from '../config/thai_templates';
import { speakThai } from '../audio/speak';
import { haptic, toast } from './ui';

export const NO_VOICE_TH = 'เครื่องนี้ไม่มีเสียงภาษาไทย: ไปที่ การตั้งค่า › ระบบ › ภาษาและการป้อนข้อมูล › เอาต์พุตการอ่านออกเสียง › ติดตั้งข้อมูลเสียง › ภาษาไทย';

export function SpeakButton({ frags }: { frags: Frag[] }) {
  const [state, setState] = useState<'idle' | 'playing' | 'none'>('idle');
  return (
    <button
      className={'speak' + (state === 'playing' ? ' playing' : '')}
      aria-label="ฟังเสียง"
      onClick={async (e) => {
        e.stopPropagation();
        haptic();
        setState('playing');
        const r = await speakThai(frags);
        if (r === 'no-voice') { setState('none'); toast('ไม่มีเสียงภาษาไทยในเครื่อง — ดูวิธีติดตั้งที่ ⚙️ ตั้งค่า'); }
        else setTimeout(() => setState('idle'), 1200);
      }}
    >
      {state === 'none' ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
    </button>
  );
}
