import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// COOP/COEP make the page crossOriginIsolated so SharedArrayBuffer and
// multithreaded WASM work (spec §16.1). Mirrored in vercel.json and public/_headers.
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'เราฟัง Rao Fang',
        short_name: 'เราฟัง',
        description: 'Offline visitor feedback for a farm-tour host',
        lang: 'th',
        theme_color: '#5b3a1e',
        background_color: '#fdf8f0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Core bundle: app shell + ONNX runtime WASM + heads.json + Thai audio clips + tour photos.
        // Model weights are NOT precached here: transformers.js stores them in its own
        // Cache Storage bucket ("transformers-cache") on first download.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,jpg,webp,json,wasm,mp3,m4a}'],
        // transformers.js also references its WASM via import.meta.url, so Vite emits a
        // duplicate copy under assets/. We load the one in /ort/ (see src/ml/env.ts).
        globIgnores: ['assets/*.wasm'],
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  worker: { format: 'es' },
  test: { environment: 'node' },
} as any);
