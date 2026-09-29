import type {StorybookConfig} from '@storybook/react-vite';

/*
 * Истории лежат рядом с компонентами, а не в отдельной папке: так они
 * не расходятся с кодом при переименовании и видны в том же обзоре,
 * что тесты и стили.
 */
const config: StorybookConfig = {
    stories: ['./*.mdx', '../src/**/*.stories.tsx'],
    addons: [
        /* axe прямо в панели истории: те же правила, что в тестах. */
        '@storybook/addon-a11y',
        /* Таблица пропсов и страница документации. */
        '@storybook/addon-docs',
    ],
    framework: {
        name: '@storybook/react-vite',
        options: {},
    },
    typescript: {
        /*
         * react-docgen-typescript, а не react-docgen: только он читает
         * типы и JSDoc из *.interface.ts, а документация здесь живёт
         * именно там. Фильтр отсекает чужие пропсы — без него в таблицу
         * попадают все атрибуты HTMLElement из @types/react.
         */
        reactDocgen: 'react-docgen-typescript',
        reactDocgenTypescriptOptions: {
            /*
             * Корневой tsconfig.json здесь solution-style: files: [] плюс
             * references. Докген, взяв его по умолчанию, не видит НИ ОДНОГО
             * файла и молча отдаёт пустые пропсы — замерено, у компонента
             * не появлялось даже __docgenInfo. Поэтому путь указан явно.
             */
            tsconfigPath: 'tsconfig.app.json',
            shouldExtractLiteralValuesFromEnum: true,
            shouldRemoveUndefinedFromOptional: true,
            propFilter: prop => !/node_modules/.test(prop.parent?.fileName ?? ''),
        },
    },
};

export default config;
