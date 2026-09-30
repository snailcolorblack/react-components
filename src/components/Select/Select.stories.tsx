import {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {Select} from './Select';

type Deposit = {value: number, name: string, visibleName: string, closed?: boolean};

const CURRENCIES = ['Рубль', 'Доллар', 'Евро', 'Юань'];
const DEPOSITS: Deposit[] = [
    {value: 1, name: 'safe', visibleName: 'Надёжный'},
    {value: 2, name: 'kids', visibleName: 'Детский'},
    {value: 3, name: 'save', visibleName: 'Накопительный', closed: true},
];

const meta = {
    title: 'Формы/Select',
    component: Select,
    args: {label: 'Выберите валюту', items: CURRENCIES},
    argTypes: {variant: {control: 'inline-radio', options: ['single', 'multi']}},
    parameters: {
        docs: {description: {component: `Нативного \`<select>\` здесь нет: он стилизуется только через \`appearance: base-select\`,
то есть пока лишь в Chromium, и даже там закрытое поле рисует выбранный пункт одним
слипшимся текстом. Вместо него кнопка \`role="combobox"\` и список \`role="listbox"\`
по паттерну combobox из APG.

\`single\` и \`multi\` отличаются двумя вещами: выбор заменяет прежний или добавляется
к нему, и закрывается ли список. В форму и там, и там уходит по скрытому полю
на каждое значение.

Подпись — плавающая, но это именно подпись, а не placeholder: после выбора она
остаётся видимой, и поле не теряет имени (требование WCAG 3.3.2).`}},layout: 'padded'},
} satisfies Meta<typeof Select<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Массив строк не требует ни `itemLabel`, ни `itemValue`. */
export const Один: Story = {};

export const СВыбраннымЗначением: Story = {args: {defaultValue: 'Евро'}};

/** Объекты: `itemLabel` — что показать, `itemValue` — что уйдёт в форму. */
export const ОбъектыСКлючами: StoryObj<typeof Select<Deposit>> = {
    args: {
        label: 'Вид депозита',
        items: DEPOSITS,
        itemLabel: 'visibleName',
        itemValue: 'value',
        itemDisabled: 'closed',
    },
};

/** `itemRender` меняет разметку пункта — иконка, вторая строка, что угодно. */
export const СвояРазметкаПункта: StoryObj<typeof Select<Deposit>> = {
    args: {
        label: 'Вид депозита',
        items: DEPOSITS,
        itemValue: 'value',
        itemText: 'visibleName',
        itemRender: item => <><span aria-hidden="true">★</span>{' '}{item.visibleName}</>,
    },
};

/** Несколько значений: выбранное показано чипсами, список не закрывается. */
export const Несколько: Story = {
    render: () => <Select variant="multi" label="Выберите валюты" items={CURRENCIES}/>,
};

/** Управляемый снаружи: значение живёт в состоянии страницы. */
export const НесколькоСнаружи: Story = {
    render: function Controlled() {
        const [value, setValue] = useState<string[]>(['Рубль']);

        return <>
            <Select variant="multi" label="Выберите валюты" items={CURRENCIES}
                    value={value} onChange={setValue}/>
            <p>Выбрано: {value.join(', ') || '—'}</p>
        </>;
    },
};

/**
 * Чипсы у `multi` настраиваются отдельно: `chipRender` — разметка, `itemText` —
 * текстовое имя для «Убрать …», переменные — отступы и скругление.
 */
export const ЧипсыПоСвоему: StoryObj<typeof Select<Deposit>> = {
    render: () => (
        <Select
            variant="multi" label="Вид депозита" items={DEPOSITS}
            itemValue="value" itemText="visibleName"
            itemRender={item => <>{item.visibleName} <small>({item.name})</small></>}
            chipRender={item => <>{item.name}</>}
            defaultValue={[1, 2]}
            style={{'--select-chip-radius': '4px', '--select-chip-padding': '2px 10px'} as React.CSSProperties}
        />
    ),
};

/**
 * Выключенное поле: кнопка не нажимается и выпадает из табуляции, чипсы
 * не убираются, значение не уходит в форму — скрытые поля тоже выключены.
 */
export const Выключенный: Story = {args: {defaultValue: 'Евро', disabled: true}};

export const ВыключенныйСЧипсами: Story = {
    render: () => (
        <Select variant="multi" label="Выберите валюты" items={CURRENCIES}
                defaultValue={['Рубль', 'Евро']} disabled/>
    ),
};

/**
 * Обязательный выбор. Форма не отправится, пока ничего не выбрано.
 *
 * Держит это отдельное скрытое поле без имени: значения уходят через
 * `type="hidden"`, а такие поля спецификация из проверки формы исключает —
 * до этого `required` у поля выбора не работал вовсе. Фокус, который браузер
 * наводит на невидимого спутника, компонент сразу переводит на кнопку.
 */
export const Обязательный: Story = {
    render: () => (
        <form style={{display: 'grid', gap: '1rem'}}>
            <Select label="Валюта" name="currency" items={CURRENCIES} required/>
            <button type="submit">Отправить</button>
        </form>
    ),
};

/** Своя ошибка: ответ сервера или проверка по другим полям формы. */
export const СвояОшибка: Story = {
    args: {label: 'Валюта', error: 'Эта валюта сейчас недоступна', defaultValue: 'Евро'},
};
