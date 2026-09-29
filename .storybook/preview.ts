import {themes} from 'storybook/theming';
import type {Preview} from '@storybook/react-vite';
import './theme.css';
/*
 * Палитра проекта живёт в :root в App.css, а сброс — в index.css.
 * Без них var(--base-color-200) остаётся невычислимым, и по правилам
 * IACVT браузер выбрасывает всё объявление целиком: замерено — фон
 * и рамки у плашек пропадают, компоненты выглядят бесцветными.
 */
import '../src/index.css';
import '../src/App.css';

const preview: Preview = {
    /* Страница документации у каждой истории — без отдельного .mdx. */
    tags: ['autodocs'],
    parameters: {
        /* Тёмная тема документации: иначе белая страница поверх тёмных историй. */
        docs: {theme: themes.dark},
        layout: 'centered',
        controls: {expanded: true},
        backgrounds: {disable: true},
        a11y: {
            /*
             * Контраст проверяется в браузере на настоящем фоне, а не
             * здесь: в изолированной истории axe часто видит прозрачный
             * фон вместо палитры и врёт.
             */
            config: {rules: [{id: 'color-contrast', enabled: false}]},
        },
    },
};

export default preview;
