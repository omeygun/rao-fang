// Uncertainty thresholds (spec §6.3). Defaults below; when heads.json carries
// thresholds tuned on the synthetic dev split (ml/train_student.py), those win.
export const DEFAULT_THRESHOLDS = {
  tauHi: 0.6,
  tauLo: 0.35,
  minWords: 3,
  /** Aspect cards with fewer distinct guests than this get the weak-evidence badge. */
  weakEvidenceN: 3,
};
export type Thresholds = typeof DEFAULT_THRESHOLDS;
