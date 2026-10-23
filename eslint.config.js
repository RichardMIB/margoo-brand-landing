import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // referencia/ é registro do processo (protótipo aprovado), não código do app
  globalIgnores(['dist', 'referencia', 'public']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.node,
    },
  },
  {
    // Funções desse script são serializadas e rodam dentro da página no Chrome
    files: ['scripts/check-layout.mjs', 'scripts/bake-envmap.mjs', 'scripts/bake-posters.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
])
