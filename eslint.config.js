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
    rules: {
      /*
       * Именованная функция объявляется через `function`.
       * `const foo = () => {}` → предупреждение.
       *
       * Правило намеренно НЕ трогает:
       *  - стрелки, переданные аргументом (useEffect, map, addEventListener);
       *  - `const handle = useCallback(() => …, [])` — справа вызов, а не
       *    функциональное выражение, так что мемоизированные обработчики
       *    остаются законными без исключений.
       *
       * Уровень `warn`, а не `error`: это «по возможности». Там, где стрелка
       * выигрывает, глушится точечно:
       *    // eslint-disable-next-line func-style -- причина
       */
      'func-style': ['warn', 'declaration', { allowArrowFunctions: false }],
      /*
       * Обратная сторона того же правила: то, что передаётся аргументом,
       * пишется стрелкой, а не `function () {}`.
       * allowNamedFunctions — для рекурсивных колбэков, где имя нужно.
       */
      'prefer-arrow-callback': ['warn', { allowNamedFunctions: true }],

      /* ------------------------------------------------------------------ */
      /*  Данные — в const                                                  */
      /* ------------------------------------------------------------------ */

      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],

      /* ------------------------------------------------------------------ */
      /*  React                                                             */
      /* ------------------------------------------------------------------ */

      /*
       * Зависимости хуков — ошибка, а не предупреждение: неполный массив
       * зависимостей у useCallback/useMemo даёт stale closure, который
       * не видно ни в типах, ни в рантайме.
       */
      'react-hooks/exhaustive-deps': 'error',

      /* ------------------------------------------------------------------ */
      /*  TypeScript                                                        */
      /* ------------------------------------------------------------------ */

      /* Типы импортируются через `import type` — не попадают в рантайм-бандл. */
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      /* Пропсы аннотируются на параметре. React.FC ничего не даёт с React 18+. */
      'no-restricted-syntax': [
        'warn',
        {
          selector: "TSTypeReference > TSQualifiedName[right.name=/^(FC|FunctionComponent|SFC)$/]",
          message: 'Не используйте React.FC — аннотируйте пропсы на параметре: function C({a}: CProps).',
        },
        {
          selector: "TSTypeReference > Identifier[name=/^(FC|FunctionComponent|SFC)$/]",
          message: 'Не используйте FC — аннотируйте пропсы на параметре: function C({a}: CProps).',
        },
      ],
    },
  },
])
