import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const repoName = 'tower-mmo'

export default defineConfig({
  plugins: [react()],
  base: `/${repoName}/`,
  resolve: {
    alias: {
      '@tower/shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})