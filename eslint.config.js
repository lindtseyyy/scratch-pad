import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'playwright-report',
      'test-results',
      'src/lib/database.types.ts',
      'supabase/.temp',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true, allowExportNames: ['useToast', 'useAuth', 'useTheme'] },
      ],
    },
  },
  { files: ['**/*.mjs', '*.js'], languageOptions: { globals: globals.node } },
  {
    files: ['extension/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.webextensions } },
  },
)
