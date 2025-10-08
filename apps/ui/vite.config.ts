/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/ui',
  server: {
    port: 4200,
    host: 'localhost',
    https: {
      key: fs.readFileSync(resolve(__dirname, 'certs/key.pem')),
      cert: fs.readFileSync(resolve(__dirname, 'certs/cert.pem')),
    },
  },
  preview: {
    port: 4200,
    host: 'localhost',
    https: {
      key: fs.readFileSync(resolve(__dirname, 'certs/key.pem')),
      cert: fs.readFileSync(resolve(__dirname, 'certs/cert.pem')),
    },
  },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
