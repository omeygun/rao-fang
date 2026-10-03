import type { ReactNode } from 'react';

export function TopBar({ title, back = '#/', right }: { title: string; back?: string; right?: ReactNode }) {
  return (
    <header className="topbar">
      <a className="back" href={back} aria-label="กลับ">←</a>
      <h1>{title}</h1>
      <span>{right}</span>
    </header>
  );
}
