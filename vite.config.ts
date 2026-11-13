import react from '@vitejs/plugin-react'
import * as path from 'node:path'
import { defineConfig } from 'vite'

const browsers = ['chrome121', 'edge121', 'firefox134', 'safari18.2']

export default defineConfig({
  plugins: [react()],

  build: {
    target: browsers,
    cssTarget: browsers,
  },

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      'layout': path.resolve(import.meta.dirname, 'src/layouts'),
      'component': path.resolve(import.meta.dirname, 'src/components'),
    },
  },
})
