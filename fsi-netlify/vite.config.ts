import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: 'index.html',
        privacidade: 'privacidade.html',
        termos: 'termos.html',
      },
    },
  },
});
