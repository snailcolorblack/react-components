import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from './Button';

const meta = {
    title: 'Формы/Button',
    component: Button,
    args: {children: 'Сохранить'},
    argTypes: {
        variant: {control: 'inline-radio', options: ['DEFAULT', 'CONTRAST', 'OUTLINE', 'INLINE']},
        size: {control: 'inline-radio', options: ['FIT', 'FULL']},
    },
    parameters: {
        docs: {description: {component: `Кнопка и ссылка одним компонентом: \`as="a"\` меняет тег, а вместе с ним и типы —
у ссылки закрыты \`disabled\`, \`type\` и триггерные пропсы поповера.

\`loading\` не ставит \`disabled\`, а только \`aria-busy\` с \`aria-disabled\` и гасит клик:
настоящий \`disabled\` выбросил бы кнопку из табуляции вместе с фокусом.
Внутри \`<form action>\` проп не нужен вовсе — кнопка отправки берёт состояние
у формы через \`useFormStatus\`.

Цвета перебиваются переменными на элементе. Акцент идёт парой: заливка
\`--button-accent\` и подпись на ней \`--button-accent-contrast\`; порознь их менять
нельзя — белым по зелёному выходит 2.49:1 (замерено).`}},
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Обычная: Story = {};

export const Варианты: Story = {
    render: args => (
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <Button {...args} variant="DEFAULT">Основная</Button>
            <Button {...args} variant="CONTRAST">Контрастная</Button>
            <Button {...args} variant="OUTLINE">Контурная</Button>
            <Button {...args} variant="INLINE">Как текст</Button>
        </div>
    ),
};

export const НаВсюШирину: Story = {args: {size: 'FULL'}, parameters: {layout: 'padded'}};

export const Активная: Story = {args: {active: true}};

/**
 * `loading` гасит клик и ставит `aria-busy` с `aria-disabled`, но не
 * `disabled`: иначе кнопка выпала бы из табуляции вместе с фокусом.
 */
export const Загрузка: Story = {args: {loading: true}};

export const Выключенная: Story = {args: {disabled: true}};

/** Полиморфность: та же кнопка тегом `a`. У ссылки нет `disabled` и `type`. */
export const Ссылка: Story = {
    args: {as: 'a', href: '#', children: 'Отчёт'} as never,
};

/**
 * Внутри формы с `action` проп `loading` не нужен: кнопка отправки берёт
 * состояние у формы через `useFormStatus` и сама гасит повторные нажатия.
 */
export const ВФорме: Story = {
    render: () => (
        <form
            action={() => new Promise(resolve => setTimeout(resolve, 1500))}
            style={{display: 'flex', gap: '1rem', alignItems: 'center'}}
        >
            <Button type="submit">Отправить</Button>
            <Button>Кнопка рядом</Button>
        </form>
    ),
};

/**
 * Свои цвета — парой. Одна переменная без второй даёт нечитаемую подпись:
 * белым по зелёному 2.49:1 (замерено).
 */
export const СвойАкцент: Story = {
    args: {
        style: {
            '--button-accent': 'var(--purple-color-200, rebeccapurple)',
            '--button-accent-contrast': 'var(--contrast-color)',
        } as React.CSSProperties,
    },
};
