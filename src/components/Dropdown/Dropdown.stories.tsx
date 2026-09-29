import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '../Button/Button';
import {Dropdown} from './Dropdown';
import type {DropdownItem} from './Dropdown.interface';

const ITEMS: DropdownItem[] = [
    {label: 'Копировать', iconStart: '⧉', iconEnd: '⌘C'},
    {label: 'Переименовать'},
    {label: 'Открыть в новой вкладке', href: '#', target: '_blank'},
    {label: 'Недоступно', disabled: true},
    {label: 'Удалить', danger: true, separator: 'before'},
];

const meta = {
    title: 'Слои/Dropdown',
    component: Dropdown,
    args: {items: ITEMS, trigger: 'Действия'},
    argTypes: {
        placement: {control: 'inline-radio', options: ['block-end', 'block-start', 'inline-end', 'inline-start']},
    },
    parameters: {
        docs: {description: {component: `Меню на том же нативном поповере: открытие, закрытие и возврат фокуса — браузерные,
свои только стрелки, Home/End и выбор.

Пункты описываются данными (\`items\`), а не разметкой: у каждого могут быть иконки
с двух сторон, разделитель, опасный вид и \`href\` — тогда пункт рендерится ссылкой.
Недоступный пункт получает \`aria-disabled\`, а не \`disabled\`: так он остаётся
в порядке чтения и объясняет себя, вместо того чтобы молча исчезнуть.`}},
    },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Обычный: Story = {};

export const Сбоку: Story = {args: {placement: 'inline-end', trigger: 'Сбоку', triggerProps: {variant: 'OUTLINE'}}};

/** Триггеру можно передать любые пропсы кнопки — например имя для иконки. */
export const ИконкаТриггер: Story = {
    args: {trigger: '⋯', triggerProps: {variant: 'CONTRAST', 'aria-label': 'Ещё'}},
};

/** Или подменить триггер целиком: компонент сам навесит на него нужные атрибуты. */
export const СвойТриггер: Story = {
    render: () => (
        <Dropdown items={ITEMS}>
            <Button variant="OUTLINE"><span aria-hidden="true">☰</span> Кастомный триггер</Button>
        </Dropdown>
    ),
};
