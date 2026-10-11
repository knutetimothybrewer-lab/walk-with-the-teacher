import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const single = !!process.env.SINGLE;

/** Browsers refuse module scripts on file://, so the multi-file build ships one classic (IIFE) script. */
function classicScript(): Plugin {
  return {
    name: 'riverton-classic-script', apply: 'build', enforce: 'post',
    transformIndexHtml(html) {
      const tags: string[] = [];
      const rest = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>\s*/g, (_m, src) => { tags.push(`<script defer src="${src}"></script>`); return ''; })
        .replace(/ crossorigin(="[^"]*")?/g, '');
      return rest.replace('</body>', `${tags.join('\n')}\n</body>`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), ...(single ? [viteSingleFile()] : [classicScript()])],
  build: {
    outDir: single ? 'dist-single' : 'dist',
    assetsInlineLimit: single ? 100000000 : 4096,
    ...(single ? {} : { modulePreload: false, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } }),
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts', 'src/**/*.test.ts'] },
});
