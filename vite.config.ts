import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import autoprefixer from 'autoprefixer';
import * as path from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: '/mayastack/',
  plugins: [react(), tailwindcss()],
  css: {
    postcss: {
      plugins: [
        autoprefixer({}), // add options if needed
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@components': path.resolve(import.meta.dirname, 'src/components'),
      '@constants': path.resolve(import.meta.dirname, 'src/constants'),
      '@utils': path.resolve(import.meta.dirname, 'src/utils'),
      '@views': path.resolve(import.meta.dirname, 'src/views'),
      '@context': path.resolve(import.meta.dirname, 'src/context'),
      '@hooks': path.resolve(import.meta.dirname, 'src/hooks'),
    },
  },
});
