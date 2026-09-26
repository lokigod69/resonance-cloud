import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Vercel's Vite preset only routes named handlers; `export default` hangs every request.
    files: ['api/**/*.ts'],
    ignores: ['api/**/_shared/**'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'ExportDefaultDeclaration',
        message: 'Vercel functions need named exports (GET, POST, …), not export default.',
      }, {
        selector: "ExportSpecifier[exported.name='default']",
        message: 'Vercel functions need named exports (GET, POST, …), not export default.',
      }],
    },
  },
])
