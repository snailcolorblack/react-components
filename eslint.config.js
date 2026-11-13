import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import perfectionist from 'eslint-plugin-perfectionist'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { hookOrder } from './eslint-rules/hook-order.js'

export default defineConfig([
  globalIgnores(['dist', 'storybook-static']),
  {
    files: ['**/*.tsx'],
    extends: [jsxA11y.flatConfigs.recommended],
  },
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
          /*
           * Побочные импорты стилей тоже переносим вниз, иначе
           * `import './App.css'` остаётся там, где его положили, да ещё
           * и делит шапку надвое: через неотсортированный импорт
           * правило ничего не переставляет.
           */
          sortSideEffects: true,
          /*
           * Порядок задан не местом файла, а его ролью в модуле — так
           * шапка читается сверху вниз как рассказ: на чём построено,
           * из чего собрано, чем типизировано, чем подпёрто, чем покрашено.
           *
           * Группы разбираются в порядке объявления, поэтому стили стоят
           * первыми: `import styles from './X.module.css'` — тоже импорт
           * по умолчанию, и без этого он попал бы к остальным умолчаниям.
           */
          customGroups: [
            // Стили — всегда последними, но разобрать их нужно первыми.
            {groupName: 'styles', selector: 'style', type: 'unsorted'},
            {groupName: 'styles', selector: 'side-effect-style', type: 'unsorted'},
            // React и его типы — впереди всего: на нём построено остальное.
            {
              groupName: 'react',
              selector: 'external',
              modifiers: ['value'],
              elementNamePattern: '^react(/.*)?$|^react-dom(/.*)?$',
            },
            {
              groupName: 'react-type',
              selector: 'external',
              modifiers: ['type'],
              elementNamePattern: '^react(/.*)?$|^react-dom(/.*)?$',
            },
            // Хуки и утилиты — подпорки, а не части сборки.
            {
              groupName: 'tools',
              modifiers: ['value'],
              elementNamePattern: '(^|/)hooks?/|(^|/)utils?/|(^|/)helpers?/',
            },
            // Импорт по умолчанию: обычно это целый кусок страницы.
            {groupName: 'defaults', modifiers: ['default', 'value']},
          ],
          groups: [
            'react',
            'react-type',
            'defaults',
            ['value-builtin', 'value-external'],
            ['value-internal', 'value-parent', 'value-sibling', 'value-index'],
            ['type-builtin', 'type-external'],
            ['type-internal', 'type-parent', 'type-sibling', 'type-index'],
            'tools',
            'unknown',
            'styles',
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
