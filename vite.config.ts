import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // Split vendor chunks for better caching
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          vendorReact: ['react', 'react-dom'],
          vendorUi: [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
          ],
          vendorSyntax: ['react-syntax-highlighter'],
          vendorMarkdown: ['react-markdown', 'remark-gfm', 'rehype-raw'],
          vendorTable: ['@tanstack/react-table', '@tanstack/react-virtual'],
          vendorI18n: ['i18next', 'i18next-browser-languagedetector', 'react-i18next'],
          vendorIcons: ['lucide-react'],
          vendorTauri: [
            '@tauri-apps/api',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-opener',
          ],
          vendorEditor: ['@uiw/react-textarea-code-editor'],
          vendorMisc: [
            'zustand',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'react-hotkeys-hook',
            'react-resizable-panels',
          ],
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
}));
