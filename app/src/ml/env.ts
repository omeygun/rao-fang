// Shared transformers.js setup: same-origin WASM runtime, multithreading when
// crossOriginIsolated (spec §16.1), WebGPU detection with WASM fallback.
import { env } from '@huggingface/transformers';

export const MODELS = {
  // Default ASR is whisper-tiny: in the Phase 0 emulation, base pushed the core bundle over 200 MB
  // and took > 10 s for 11 s of audio at 4x CPU throttle (docs/benchmarks.md). Base stays selectable.
  asrTiny: 'Xenova/whisper-tiny',
  asrBase: 'Xenova/whisper-base',
  embed: 'Xenova/multilingual-e5-small',
  translate: 'Xenova/nllb-200-distilled-600M',
} as const;

/** transformers.js stores downloaded model files in this Cache Storage bucket. */
export const MODEL_CACHE = 'transformers-cache';

let configured = false;
export function configureEnv() {
  if (configured) return;
  configured = true;
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  // The service worker already precaches /ort/*; transformers.js would store a second 25.7 MB copy.
  env.useWasmCache = false;
  const wasm = env.backends.onnx.wasm!;
  wasm.wasmPaths = {
    mjs: '/ort/ort-wasm-simd-threaded.asyncify.mjs',
    wasm: '/ort/ort-wasm-simd-threaded.asyncify.wasm',
  };
  wasm.numThreads = wasmThreads();
}

/** Threads actually requested from ONNX Runtime WASM. >1 needs SharedArrayBuffer (crossOriginIsolated). */
export function wasmThreads(): number {
  if (!globalThis.crossOriginIsolated) return 1;
  return Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1));
}

export async function webgpuAvailable(): Promise<boolean> {
  const gpu = (navigator as any).gpu;
  if (!gpu) return false;
  try {
    return !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

export type Device = 'webgpu' | 'wasm';
let devicePromise: Promise<Device> | null = null;
/**
 * Device for inference. WASM is the default because q8 models are best supported there;
 * WebGPU can be forced from the DevBenchmark page to compare.
 */
export function pickDevice(): Promise<Device> {
  devicePromise ??= (async () => {
    const forced = localStorage.getItem('raofang.device');
    if (forced === 'webgpu' && (await webgpuAvailable())) return 'webgpu';
    return 'wasm';
  })();
  return devicePromise;
}

export type Progress = (p: { file?: string; loaded?: number; total?: number; status: string }) => void;
