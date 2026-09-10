import js from '@eslint/js'
import globals from 'globals'
import perfectionist from 'eslint-plugin-perfectionist'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { hookOrder } from './eslint-rules/hook-order.js'

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
    plugins: {
      perfectionist,
      local: { rules: { 'hook-order': hookOrder } },
    },
    rules: {
      'func-style': 'off',
      'prefer-arrow-callback': ['warn', { allowNamedFunctions: true }],
      'padding-line-between-statements': [
        'warn',
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'react-hooks/exhaustive-deps': 'error',
      'perfectionist/sort-imports': [
        'warn',
        {
          type: 'natural',
          newlinesBetween: 'ignore',
          groups: [
            ['value-builtin', 'value-external'],
            ['type-builtin', 'type-external'],
            ['value-internal', 'value-parent', 'value-sibling', 'value-index'],
            ['type-internal', 'type-parent', 'type-sibling', 'type-index'],
            'style',
            'unknown',
          ],
        },
      ],
      'local/hook-order': 'warn',
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'VariableDeclarator > ArrowFunctionExpression[body.type="BlockStatement"]',
          message: 'Стрелка с телом { … } — объявите через function. В const оставляйте только однострочные: const close = () => setDialog(null).',
        },
        {
          selector: 'VariableDeclarator > FunctionExpression',
          message: 'Функциональное выражение в const — объявите через function.',
        },
        {
          selector: 'VariableDeclarator[id.name=/^[A-Z]/] > ArrowFunctionExpression',
          message: 'Компонент объявляется через function, а не стрелкой в const.',
        },
        {
          selector: "TSTypeReference > TSQualifiedName[right.name=/^(FC|FunctionComponent|SFC)$/]",
          message: 'Не используйте React.FC — аннотируйте пропсы на параметре: function C({a}: CProps).',
        },
        {
          selector: "TSTypeReference > Identifier[name=/^(FC|FunctionComponent|SFC)$/]",
          message: 'Не используйте FC — аннотируйте пропсы на параметре: function C({a}: CProps).',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn', { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
])
