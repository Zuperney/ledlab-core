import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const BUILD_ID = `${pkg.version}-${Date.now()}`

// Carimba um ID único de build (versão-timestamp) no service worker a cada build.
// Assim o CACHE_VERSION muda em todo deploy → o SW se reinstala, refaz o precache
// com os assets novos e apaga os caches antigos. Sem isso, o SW segue servindo um
// index.html velho cujos chunks lazy já foram purgados do servidor (→ 404).
function stampServiceWorker() {
  return {
    name: 'stamp-sw',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(process.cwd(), 'dist/sw.js')
      try {
        // lista os assets do build (main + chunks lazy) p/ precache offline completo
        let assets = []
        try {
          // js/css (main + chunks lazy) + ttf (fontes do PDF) + png (logo da capa)
          // + jpg (imagem de exemplo do crop no Aspect Ratio): sem eles no
          // precache, o offline perderia fonte, logo e o preview com imagem
          assets = readdirSync(resolve(process.cwd(), 'dist/assets'))
            .filter((f) => /\.(js|css|ttf|png|jpe?g)$/.test(f))
            .map((f) => `./assets/${f}`)
        } catch { /* sem pasta assets — ignora */ }
        const sw = readFileSync(swPath, 'utf-8')
          .replace('__BUILD_ID__', BUILD_ID)
          .replace('const BUILD_ASSETS = [];', `const BUILD_ASSETS = ${JSON.stringify(assets)};`)
        writeFileSync(swPath, sw)
      } catch {
        // dist/sw.js ausente — ignora
      }
    },
  }
}

// https://vite.dev/config/
// base: './' → caminhos de asset RELATIVOS no build, para o index.html
// funcionar carregado via file:// dentro do app Electron (janela própria).
export default defineConfig({
  base: './',
  // fonte ÚNICA da versão exibida no app (badge do topo, Configurações, aviso de
  // atualização): release = bump só no package.json. Vale no vite E no vitest.
  define: { __APP_VERSION__: JSON.stringify(`v${pkg.version}`) },
  plugins: [react(), stampServiceWorker()],
  // Honra a env PORT (usada pelo preview tool p/ alocar porta dinâmica).
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
})
