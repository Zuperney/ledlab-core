import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // arquivos de configuração rodam em Node (usam process, etc.)
  {
    files: ['**/*.config.js'],
    languageOptions: { globals: globals.node },
  },
  // contexts e módulos que exportam hooks/constantes junto do provider/componente —
  // padrão deliberado do app; o fast-refresh cai pra full reload nesses arquivos e ok.
  {
    files: ['src/store/*.jsx', 'src/components/StatusBadge.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
