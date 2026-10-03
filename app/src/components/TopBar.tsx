export function TopBar({ title, back = '#/' }: { title: string; back?: string }) {
  return (
    <header className="topbar">
      <a className="back" href={back} aria-label="กลับ">←</a>
      <h1>{title}</h1>
    </header>
  );
}
