import { ArrowLeft } from 'lucide-react';
import { CaptionToggle, En } from './ui';

export function TopBar({ title, en, back = '#/' }: { title: string; en?: string; back?: string }) {
  return (
    <header className="topbar">
      <a className="back" href={back} aria-label="กลับ"><ArrowLeft aria-hidden /></a>
      <h1>{title}{en && <En>{en}</En>}</h1>
      <CaptionToggle />
    </header>
  );
}
