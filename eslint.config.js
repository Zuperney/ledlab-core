import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // supabase/: migrations SQL + Edge Functions em Deno/TS — fora do mundo do
  // ESLint do app (globals e resolução de import próprios do Deno)
  globalIgnores(['dist', 'supabase']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // __APP_VERSION__ vem do define do vite (versão do package.json)
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // arquivos de configuração rodam em Node (usam process, etc.)
  {
    files: ['**/*.config.js'],
    languageOptions: { globals: globals.node },
  },
  // O three.js só pode ser importado DENTRO da vista 3D (src/vista3d/).
  // Motivo: o chunk 3D é lazy E fica fora do precache do service worker
  // (docs/estrutura3d-spec.md §7.2). Um único `import { Vector3 } from 'three'`
  // num helper compartilhado promove a biblioteca inteira pro chunk principal —
  // engorda o app pra todo mundo e quebra o relatório offline no celular.
  {
    files: ['src/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'three',
          message: 'three só em src/vista3d/. O motor (src/services/estrutura/) usa vetor.js.',
        }],
        patterns: [{
          group: ['three/*'],
          message: 'three só em src/vista3d/. O motor (src/services/estrutura/) usa vetor.js.',
        }],
      }],
    },
  },
  {
    files: ['src/vista3d/**/*.{js,jsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  // contexts e módulos que exportam hooks/constantes junto do provider/componente —
  // padrão deliberado do app; o fast-refresh cai pra full reload nesses arquivos e ok.
  {
    files: ['src/store/*.jsx', 'src/components/StatusBadge.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
