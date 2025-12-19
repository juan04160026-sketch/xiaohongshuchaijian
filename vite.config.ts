import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',  // 使用相对路径，Electron 需要这个
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  },
  server: {
    port: 3000
  }
});
