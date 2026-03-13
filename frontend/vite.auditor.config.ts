import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  publicDir: false,
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    entries: ['src/auditor-portal/main.tsx'],
  },
  server: {
    fs: {
      allow: [__dirname],
    },
  },
  build: {
    outDir: 'dist-auditor',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: 'auditor.html',
    },
    minify: 'esbuild',
    reportCompressedSize: false,
  },
})
