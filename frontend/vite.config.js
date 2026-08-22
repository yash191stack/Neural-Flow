import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React framework — tiny, loads first
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Three.js + all R3F/drei/postprocessing — largest chunk, cached independently
          'vendor-three': [
            'three',
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/postprocessing',
            'postprocessing',
          ],
          // Animation and charting — medium, cached independently
          'vendor-ui': ['framer-motion', 'recharts', 'zustand', 'react-hot-toast'],
        },
      },
    },
  },
})

