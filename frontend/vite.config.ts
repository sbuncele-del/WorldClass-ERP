import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable source maps for debugging (disable in production if needed)
    sourcemap: false,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - separate heavy libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts', '@ant-design/charts'],
          'vendor-utils': ['axios', 'date-fns', 'socket.io-client'],
          // Feature chunks
          'feature-maps': ['leaflet', 'react-leaflet'],
          'feature-ocr': ['tesseract.js'],
          // antd/icons deliberately NOT force-merged into one chunk here.
          // App.tsx imports {ConfigProvider, Spin} from 'antd' directly (it's
          // the always-mounted entry, not lazy), and since manualChunks groups
          // by SOURCE MODULE regardless of which export is used where, that
          // one trivial import dragged the full combined antd+icons usage
          // from all 157 files that import from 'antd' into the entry
          // chunk's eager dependency graph - a 1.4MB compressed chunk
          // preloaded on every page, including ones with no Table/Form/
          // DatePicker at all. Routes are already React.lazy()-loaded, so
          // leaving this to Rollup's automatic chunking lets each route's
          // antd usage split with that route's own chunk instead.
        },
      },
    },
    // Minification settings - use esbuild (faster, less memory than terser)
    minify: 'esbuild',
    // Skip gzip size reporting to save memory during build
    reportCompressedSize: false,
  },
  // Force single React instance to prevent hooks errors
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'axios'],
  },
})
