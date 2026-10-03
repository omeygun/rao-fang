import { renderThai, T } from '../config/thai_templates';

/** Shown under every insight (spec §6.4). */
export function DecideFooter() {
  return <p className="footer-note">ℹ️ {renderThai(T.footer())}</p>;
}
