import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '../Button/Button';
import {Tooltip} from './Tooltip';

const meta = {
    title: 'Слои/Tooltip',
    component: Tooltip,
    args: {text: 'Появляется по наведению и по фокусу', children: <Button variant="OUTLINE">Наведи курсор</Button>},
    argTypes: {
        placement: {control: 'inline-radio', options: ['block-start', 'block-end', 'inline-start', 'inline-end']},
        mode: {control: 'inline-radio', options: ['description', 'label']},
    },
    parameters: {
        docs: {description: {component: `Подсказка на \`popover="hint"\`: слой, не закрывающий чужие меню. Декларативного
триггера по наведению в платформе пока нет (\`interesttarget\` в Chromium 141
отсутствует), поэтому наведение и фокус отслеживаются сами, а триггер клонируется
с нужными обработчиками — лишней обёртки в разметке не появляется.

\`mode="description"\` связывает подсказку с триггером через \`aria-describedby\`,
\`mode="label"\` — через \`aria-labelledby\`, для кнопок из одной иконки.

На тач-устройствах подсказки нет: наведения там не существует. Ничего необходимого
в неё класть нельзя.`}},
    },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const НаКнопке: Story = {
    render: args => <Tooltip {...args}><Button variant="OUTLINE">Наведи курсор</Button></Tooltip>,
};

/**
 * `mode="label"` делает подсказку ИМЕНЕМ элемента, а не дополнением к нему:
 * это для кнопок без видимой подписи, у которых внутри одна иконка.
 */
export const ИменемДляИконки: Story = {
    args: {mode: 'label', text: 'Удалить'},
    render: args => (
        <Tooltip {...args}><Button variant="CONTRAST"><span aria-hidden="true">🗑</span></Button></Tooltip>
    ),
};

/**
 * На выключенной кнопке подсказка появляется — обработчики висят на самом
 * триггере, и Chromium доводит до него наведение (замерено). А вот фокусом
 * её не достать: Tab до `disabled` не доходит, так что с клавиатуры такой
 * подсказки не существует. Класть в неё важное нельзя.
 */
export const НаВыключенной: Story = {
    args: {text: 'Кнопка выключена, пока не выбран тариф'},
    render: args => <Tooltip {...args}><Button disabled>Оплатить</Button></Tooltip>,
};

/** Задержка — только у наведения: по фокусу подсказка появляется сразу. */
export const ДлиннаяЗадержка: Story = {
    args: {delay: 1200, text: 'Появилась через 1,2 секунды после наведения'},
    render: args => <Tooltip {...args}><Button variant="OUTLINE">Наведи и подожди</Button></Tooltip>,
};

/** Сторона — предпочтение: не хватит места, браузер перевернёт подсказку сам. */
export const Стороны: Story = {
    render: args => (
        <div style={{display: 'flex', gap: '1rem'}}>
            <Tooltip {...args} placement="block-start" text="Сверху"><Button variant="OUTLINE">Сверху</Button></Tooltip>
            <Tooltip {...args} placement="block-end" text="Снизу"><Button variant="OUTLINE">Снизу</Button></Tooltip>
            <Tooltip {...args} placement="inline-end" text="Справа"><Button variant="OUTLINE">Справа</Button></Tooltip>
        </div>
    ),
};
