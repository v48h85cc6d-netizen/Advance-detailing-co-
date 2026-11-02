import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { assetManifest } from './vite-plugins/asset-manifest';
import { visualEditorDev, visualEditorStrip } from './vite-plugins/visual-editor';

export default defineConfig({
  plugins: [visualEditorStrip(), react(), tailwindcss(), assetManifest(), visualEditorDev()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Three.js / R3F are left to the lazy PyramidScene chunk (loaded only by the hero).
          if (/three|@react-three|maath|troika|meshline|camera-controls|zustand|its-fine|suspend-react/.test(id)) return;
          if (/gsap/.test(id)) return 'gsap';
          if (/motion|framer/.test(id)) return 'motion';
          if (/i18next/.test(id)) return 'i18n';
          if (/react-router|react-dom|scheduler|\/react\//.test(id)) return 'react';
        },
      },
    },
  },
});
