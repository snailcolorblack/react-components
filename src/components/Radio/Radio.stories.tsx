import type {Meta, StoryObj} from '@storybook/react-vite';
import {Radio} from './Radio';

const meta = {
    title: 'Формы/Radio',
    component: Radio,
    args: {name: 'plan', value: 'free', children: 'Бесплатный'},
    argTypes: {variant: {control: 'inline-radio', options: ['DEFAULT', 'CHIP']}},
    parameters: {
        docs: {description: {component: `Группу держит общий \`name\` — это платформа: стрелки, переход по кругу и
«1 из 3» в озвучке достаются от браузера, состояния в компоненте нет.

Вариант CHIP убирает видимый кружок и показывает состояние подложкой. Форма
индикатора — единственное, чем оформление радио отличается от флажка.`}},
    },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Один: Story = {};

/** Группу держит общий `name` — это платформа, а не компонент. */
export const Группа: Story = {
    render: args => (
        <div style={{display: 'grid', gap: '0.5rem'}}>
            <Radio {...args} value="free" defaultChecked>Бесплатный</Radio>
            <Radio {...args} value="pro">Профессиональный</Radio>
            <Radio {...args} value="team" disabled>Командный</Radio>
        </div>
    ),
};

export const Чипсами: Story = {
    render: args => (
        <div style={{display: 'flex', gap: '0.5rem'}}>
            <Radio {...args} variant="CHIP" value="free" defaultChecked>Бесплатный</Radio>
            <Radio {...args} variant="CHIP" value="pro">Профессиональный</Radio>
        </div>
    ),
};

/** Обязательной делают всю группу: `required` достаточно одному варианту. */
export const Ошибка: Story = {
    render: () => (
        <form style={{display: 'grid', gap: '1rem', justifyItems: 'start'}}>
            <fieldset style={{display: 'grid', gap: '0.5rem', justifyItems: 'start'}}>
                <legend>Тариф</legend>
                <Radio name="plan" value="free" required>Бесплатный</Radio>
                <Radio name="plan" value="pro">Профессиональный</Radio>
            </fieldset>
            <button type="submit">Отправить</button>
        </form>
    ),
};
