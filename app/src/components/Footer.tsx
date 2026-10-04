import { renderEnglish, renderThai, T } from '../config/thai_templates';
import { En } from './ui';

/** Shown under every insight (spec §6.4). */
export function DecideFooter() {
  return <p className="footer-note">ℹ️ <span>{renderThai(T.footer())}<En>{renderEnglish(T.footer())}</En></span></p>;
}
