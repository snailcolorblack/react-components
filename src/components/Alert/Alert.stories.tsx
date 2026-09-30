import type {Meta, StoryObj} from '@storybook/react-vite';
import {Alert} from './Alert';

const meta = {
    title: 'Сообщения/Alert',
    component: Alert,
    args: {children: 'Срок действия ключа истекает'},
    argTypes: {variant: {control: 'inline-radio', options: [undefined, 'SUCCESS', 'WARNING', 'ERROR']}},
    parameters: {
        docs: {description: {component: `Плашка с сообщением. Без \`live\` это просто оформление: замерено — в дереве
доступности generic без роли, текст читается в обычном порядке.

\`live\` превращает её в живой регион, и роль выводится из варианта: ERROR получает
\`role="alert"\` (assertive, перебивает чтение), остальные — \`role="status"\` (polite).
Важно: живой регион должен быть в DOM ДО появления текста, иначе он часто молчит —
держите плашку постоянной, а меняйте содержимое.

Цвета строятся из одного акцента: заливка 16%, рамка 85%, тон иконки отдельно.`}},layout: 'padded'},
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Варианты: Story = {
    render: args => (
        <div style={{display: 'grid', gap: '0.75rem', minInlineSize: '24rem'}}>
            <Alert {...args}>Нейтральная плашка</Alert>
            <Alert {...args} variant="SUCCESS">Данные сохранены</Alert>
            <Alert {...args} variant="WARNING">Срок действия ключа истекает</Alert>
            <Alert {...args} variant="ERROR">Не удалось сохранить</Alert>
        </div>
    ),
};

/**
 * `live` превращает плашку в живой регион: ERROR получает `role="alert"`
 * (assertive), остальные — `role="status"` (polite). Ставьте его только
 * для сообщений, появившихся в ответ на действие, иначе скринридер будет
 * зачитывать плашку при каждой перерисовке.
 */
export const ЖивойРегион: Story = {args: {live: true, variant: 'ERROR', children: 'Не удалось сохранить'}};

/** Прямой `svg` внутри плашки красится тоном варианта автоматически. */
export const СИконкой: Story = {
    args: {variant: 'SUCCESS'},
    render: args => (
        <Alert {...args}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Данные сохранены
        </Alert>
    ),
};

/**
 * Вариант показан тремя вещами сразу: цветом, значком и словом в начале
 * текста. Слово скрыто от глаз и читается только озвучкой — зрячему его
 * заменяет значок. Одного цвета было бы мало: в режиме высокого контраста
 * цвета подменяет система (WCAG 1.4.1).
 */
export const ВариантыЦеликом: Story = {
    render: () => (
        <div style={{display: 'grid', gap: '0.75rem'}}>
            <Alert variant="SUCCESS">Черновик сохранён</Alert>
            <Alert variant="WARNING">Место на диске заканчивается</Alert>
            <Alert variant="ERROR">Не удалось связаться с сервером</Alert>
        </div>
    ),
};
