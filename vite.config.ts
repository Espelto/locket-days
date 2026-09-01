import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base:
    process.env.npm_lifecycle_event === 'deploy' || process.env.GITHUB_ACTIONS
      ? '/locket-days/'
      : '/',
  plugins: [react()],
})
