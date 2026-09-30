import type {Meta, StoryObj} from '@storybook/react-vite';
import {Switch} from './Switch';

const meta = {
    title: 'Формы/Switch',
    component: Switch,
    args: {children: 'Уведомления по почте'},
    parameters: {
        docs: {description: {component: `Под переключателем обычный \`<input type="checkbox">\` с \`role="switch"\`: в ARIA это
один и тот же элемент, меняется только объявление состояния — «включено» вместо
«отмечено».

В высоком контрасте заливка дорожки перестаёт что-либо значить, поэтому второй
канал даёт положение бегунка: оно от системных цветов не зависит.`}},
    },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Выключен: Story = {};

export const Включён: Story = {args: {defaultChecked: true}};

export const Недоступен: Story = {args: {disabled: true, children: 'Недоступно'}};

/** Своя ошибка: ответ сервера или проверка по другим полям формы. */
export const СвояОшибка: Story = {
    args: {children: 'Уведомления по почте', error: 'Сначала подтвердите адрес'},
};
