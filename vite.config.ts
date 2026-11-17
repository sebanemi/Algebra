import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-core': ['three'],
          'r3f-vendor': ['@react-three/fiber', '@react-three/drei'],
          'math-vendor': ['mathjs'],
        },
      },
    },
  },
});
