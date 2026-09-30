import type {Meta, StoryObj} from '@storybook/react-vite';
import {Checkbox} from './Checkbox';

const meta = {
    title: 'Формы/Checkbox',
    component: Checkbox,
    args: {children: 'Согласен с условиями'},
    argTypes: {variant: {control: 'inline-radio', options: ['DEFAULT', 'CHIP']}},
    parameters: {
        docs: {description: {component: `Стилизуется сам \`<input>\` с \`appearance: none\`, без подставного span: он остаётся
настоящим полем — с фокусом, клавиатурой, участием в форме и в дереве доступности.

\`indeterminate\` существует только свойством DOM, атрибута для него нет, поэтому
компонент проставляет его эффектом. В форму промежуточный флажок уходит как
неотмеченный.

Подписью может быть разметка, но интерактива внутри быть не должно: обёртка — это
сам \`<label>\`, и клик по вложенной ссылке уйдёт переключателю.`}},
    },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Обычный: Story = {};

export const Отмеченный: Story = {args: {defaultChecked: true}};

/**
 * `indeterminate` живёт только свойством DOM, атрибута для него нет —
 * компонент проставляет его эффектом.
 */
export const Промежуточный: Story = {args: {indeterminate: true}};

/** Вариант CHIP: сам флажок не рисуется, состояние показывает подложка. */
export const Чипсом: Story = {
    render: args => (
        <div style={{display: 'flex', gap: '0.5rem'}}>
            <Checkbox {...args} variant="CHIP" defaultChecked>Картой</Checkbox>
            <Checkbox {...args} variant="CHIP">Наличными</Checkbox>
        </div>
    ),
};

export const Выключенный: Story = {args: {disabled: true}};

/** Подписью может быть разметка: картинка, вторая строка, что угодно. */
export const СРазметкой: Story = {
    render: args => (
        <Checkbox {...args}>
            <span style={{display: 'grid'}}>
                <strong>Профессиональный</strong>
                <small>1 200 ₽ в месяц</small>
            </span>
        </Checkbox>
    ),
};

/**
 * Ошибка лежит под флажком, в разметке, и связана с ним через
 * `aria-describedby`. Пузырь браузера гасится: он исчезает по таймеру
 * и на него нельзя сослаться.
 */
export const Ошибка: Story = {
    render: () => (
        <form style={{display: 'grid', gap: '1rem', justifyItems: 'start'}}>
            <Checkbox name="terms" required>Согласен с условиями</Checkbox>
            <button type="submit">Отправить</button>
        </form>
    ),
};

/** Своя ошибка: ответ сервера или проверка по другим полям формы. */
export const СвояОшибка: Story = {
    args: {children: 'Подключить тариф', error: 'Этот тариф уже подключён'},
};
