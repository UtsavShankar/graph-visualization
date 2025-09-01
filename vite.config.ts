import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
const base = "https://utsavshankar.github.io/graph-visualization/"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base,
})