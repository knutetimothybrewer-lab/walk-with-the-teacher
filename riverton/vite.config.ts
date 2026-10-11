import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const single = !!process.env.SINGLE;
export default defineConfig({
  base: './',
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  build: { outDir: single ? 'dist-single' : 'dist', assetsInlineLimit: single ? 100000000 : 4096 },
  test: { environment: 'node', include: ['tests/**/*.test.ts', 'src/**/*.test.ts'] },
});
