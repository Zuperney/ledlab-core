import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: './' → caminhos de asset RELATIVOS no build, para o index.html
// funcionar carregado via file:// dentro do app Electron (janela própria).
export default defineConfig({
  base: './',
  plugins: [react()],
  // Honra a env PORT (usada pelo preview tool p/ alocar porta dinâmica).
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
})
