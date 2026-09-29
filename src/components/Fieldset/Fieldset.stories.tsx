import type {Meta, StoryObj} from '@storybook/react-vite';
import {Checkbox} from '../Checkbox/Checkbox';
import {Radio} from '../Radio/Radio';
import {Fieldset} from './Fieldset';

const meta = {
    title: 'Формы/Fieldset',
    component: Fieldset,
    args: {legend: 'Тарифный план'},
    argTypes: {orientation: {control: 'inline-radio', options: ['block', 'inline']}},
    parameters: {
        docs: {description: {component: `Нативные \`<fieldset>\` и \`<legend>\`: роль \`group\` с именем и \`disabled\`, выключающий
всё внутри, достаются от платформы.

\`legend\` обязателен и по умолчанию СКРЫТ визуально — но не от доступности: прячется
обрезкой, а не \`display: none\`, поэтому остаётся именем группы (замерено).
Показать его — явный \`showLegend\`.`}},layout: 'padded'},
} satisfies Meta<typeof Fieldset>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Подпись обязательна: без неё группа остаётся безымянной для скринридера.
 * По умолчанию она скрыта визуально, но не от доступности — `showLegend`
 * показывает её.
 */
export const Группа: Story = {
    args: {showLegend: true},
    render: args => (
        <Fieldset {...args}>
            <Radio name="plan" value="free" defaultChecked>Бесплатный</Radio>
            <Radio name="plan" value="pro">Профессиональный</Radio>
        </Fieldset>
    ),
};

export const ПодписьСкрыта: Story = {
    render: args => (
        <Fieldset {...args} legend="Способ оплаты">
            <Checkbox name="pay" value="card">Картой</Checkbox>
            <Checkbox name="pay" value="cash">Наличными</Checkbox>
        </Fieldset>
    ),
};

export const ВСтроку: Story = {
    args: {showLegend: true, orientation: 'inline'},
    render: args => (
        <Fieldset {...args}>
            <Checkbox name="pay" value="card">Картой</Checkbox>
            <Checkbox name="pay" value="cash">Наличными</Checkbox>
        </Fieldset>
    ),
};

/** `disabled` у fieldset выключает всё внутри — это платформа, не наш код. */
export const ЦеликомВыключена: Story = {
    args: {showLegend: true, disabled: true},
    render: args => (
        <Fieldset {...args}>
            <Radio name="off" value="a">Первый</Radio>
            <Radio name="off" value="b">Второй</Radio>
        </Fieldset>
    ),
};
