import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '../Button/Button';
import {Typography} from '../Typography/Typography';
import {Popover} from './Popover';

const meta = {
    title: 'Слои/Popover',
    component: Popover,
    args: {label: 'Поповер', id: 'story-popover'},
    argTypes: {
        placement: {control: 'inline-radio', options: ['block-end', 'block-start', 'inline-end', 'inline-start']},
        popover: {control: 'inline-radio', options: ['auto', 'manual', 'hint']},
    },
    parameters: {
        docs: {description: {component: `Нативный \`popover\`: верхний слой (не режется \`overflow\` и не спорит с \`z-index\`),
Esc, закрытие кликом мимо, возврат фокуса и вытеснение соседнего \`auto\`-поповера.
Позиция — на CSS anchor positioning, с переворотом у края экрана.

Своей роли компонент не ставит: \`<div popover>\` попадает в дерево доступности как
generic. Задайте её сами под содержимое и обязательно дайте \`label\` — иначе область
останется безымянной.`}},
    },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * `popover="auto"`: Esc и клик мимо закрывают его сами, фокус
 * возвращается на кнопку, одновременно открыт только один. Всё это
 * делает браузер.
 */
export const Базовый: Story = {
    render: args => <>
        <Button popoverTarget="story-popover" variant="OUTLINE">Открыть</Button>
        <Popover {...args} id="story-popover">
            <Typography as="p">Содержимое поповера. Нажмите Esc или мимо.</Typography>
        </Popover>
    </>,
};

export const Сбоку: Story = {
    args: {placement: 'inline-end', id: 'story-popover-side'},
    render: args => <>
        <Button popoverTarget="story-popover-side" variant="OUTLINE">Открыть сбоку</Button>
        <Popover {...args} id="story-popover-side">
            <Typography as="p">Если справа не хватит места, браузер перевернёт его сам.</Typography>
        </Popover>
    </>,
};

/** `manual` не реагирует ни на Esc, ни на клик мимо: закрывает только кнопка. */
export const Ручной: Story = {
    args: {popover: 'manual', id: 'story-popover-manual'},
    render: args => <>
        <Button popoverTarget="story-popover-manual" variant="OUTLINE">Открыть ручной</Button>
        <Popover {...args} id="story-popover-manual">
            <Typography as="p">Закройте кнопкой ниже.</Typography>
            <Button popoverTarget="story-popover-manual" popoverTargetAction="hide">Закрыть</Button>
        </Popover>
    </>,
};
