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
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'vendorReact';
            }
            if (id.includes('@radix-ui/')) {
              return 'vendorUi';
            }
            if (id.includes('react-syntax-highlighter')) {
              return 'vendorSyntax';
            }
            if (
              id.includes('react-markdown') ||
              id.includes('remark-gfm') ||
              id.includes('rehype-raw')
            ) {
              return 'vendorMarkdown';
            }
            if (id.includes('@tanstack/')) {
              return 'vendorTable';
            }
            if (id.includes('i18next')) {
              return 'vendorI18n';
            }
            if (id.includes('lucide-react')) {
              return 'vendorIcons';
            }
            if (id.includes('@tauri-apps/')) {
              return 'vendorTauri';
            }
            if (id.includes('@uiw/react-textarea-code-editor')) {
              return 'vendorEditor';
            }
            if (
              id.includes('zustand') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge') ||
              id.includes('class-variance-authority') ||
              id.includes('react-hotkeys-hook') ||
              id.includes('react-resizable-panels')
            ) {
              return 'vendorMisc';
            }
          }
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
