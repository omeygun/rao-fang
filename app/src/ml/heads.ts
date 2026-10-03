// Classifier heads exported by ml/export_heads.py (public/models/heads.json).
// Pure math, no model dependency, so it is unit-testable.
import type { Aspect, Sentiment } from '../config/aspects';

export interface BinaryHead { w: number[]; b: number }
export interface HeadsFile {
  format: 'rao-fang-heads/1';
  version: string;
  encoder: string;
  prefix: string;
  pooling: 'mean';
  normalize: true;
  dim: number;
  aspects: Record<Aspect, BinaryHead>;
  /**
   * "aspect": "query: {text} [aspect: {aspect}]"; "clause": same, on the clause that mentions the aspect;
   * "polarity": untagged "query: {clause}"; "item": one item-level head (simplification).
   */
  sentimentMode: 'aspect' | 'clause' | 'polarity' | 'item';
  sentiment: { classes: Sentiment[]; W: number[][]; b: number[] };
  suggestion: BinaryHead;
  thresholds: { tauHi: number; tauLo: number; tunedOn?: string };
  trainedOn?: string;
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
export function dot(w: ArrayLike<number>, x: ArrayLike<number>) {
  let s = 0;
  for (let i = 0; i < w.length; i++) s += w[i] * x[i];
  return s;
}
export const binaryProb = (h: BinaryHead, x: ArrayLike<number>) => sigmoid(dot(h.w, x) + h.b);

export function softmax(z: number[]) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

export function sentimentProbs(h: HeadsFile['sentiment'], x: ArrayLike<number>) {
  // sklearn multinomial LogisticRegression: softmax(W x + b).
  return softmax(h.W.map((row, k) => dot(row, x) + h.b[k]));
}

export function validateHeads(h: any): h is HeadsFile {
  return h && h.format === 'rao-fang-heads/1' && h.aspects && h.sentiment && h.suggestion && h.dim > 0;
}
