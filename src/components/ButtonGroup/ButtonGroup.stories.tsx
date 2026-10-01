import {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {ButtonGroup} from './ButtonGroup';

const meta = {
    title: 'Формы/ButtonGroup',
    component: ButtonGroup,
    args: {label: 'Способ оплаты'},
    argTypes: {variant: {control: 'inline-radio', options: ['LINE', 'PILL']}},
    parameters: {
        docs: {
            description: {
                component: `Сегментированный переключатель: коробка, кнопки встык и таблетка
под активной.

Внутри настоящие \`<input type="radio">\` с \`appearance: none\`, обёрнутые
в \`<label>\`, а вокруг — \`<fieldset>\` с \`<legend>\`. Отсюда всё достаётся
от платформы: стрелки ходят по вариантам, на всю группу одна остановка
табуляции, значение уходит в форму, взаимное исключение делает общий
\`name\`. Своего React-состояния у компонента нет вовсе, пока им не
управляют снаружи.

Таблетка ездит на CSS anchor positioning: имя якоря есть только
у выбранного варианта, индикатор к нему привязан, переходы по
\`left\`/\`width\` дают скольжение. Замерено в Chromium 141 — 36px → 111px
на середине пути → 204px, без единого замера в JS. Прежний способ (чтения
\`offsetLeft\`, ResizeObserver, MutationObserver по поддереву и библиотека
анимации) больше не нужен. Там, где anchor positioning не поддержан,
таблетки нет, а фон берёт сама активная кнопка.

Это не вкладки: кнопки ничего не открывают. Если они переключают панели
с содержимым, нужен \`<Tabs variant="GROUP">\` — тот же вид, но роли
вкладок и связи с панелями.`,
            },
        },
    },
} satisfies Meta<typeof ButtonGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Обычная группа. Имя есть, но глазами не видно. */
export const Базовая: Story = {
    render: () => (
        <ButtonGroup label="Способ оплаты" name="pay" defaultValue="nbt">
            <ButtonGroup.Item value="nbt">НБТ</ButtonGroup.Item>
            <ButtonGroup.Item value="cash">В кассе</ButtonGroup.Item>
            <ButtonGroup.Item value="card">Картой</ButtonGroup.Item>
            <ButtonGroup.Item value="wire">Безналичные</ButtonGroup.Item>
        </ButtonGroup>
    ),
};

/** С видимым заголовком: `showLabel`. */
export const СЗаголовком: Story = {
    render: () => (
        <ButtonGroup label="Период" name="period" defaultValue="month" showLabel>
            <ButtonGroup.Item value="week">Неделя</ButtonGroup.Item>
            <ButtonGroup.Item value="month">Месяц</ButtonGroup.Item>
            <ButtonGroup.Item value="year">Год</ButtonGroup.Item>
        </ButtonGroup>
    ),
};

/** Недоступный вариант остаётся в группе и объявляется скринридером. */
export const ВыключенныйВариант: Story = {
    render: () => (
        <ButtonGroup label="Валюта" name="currency" defaultValue="tjs">
            <ButtonGroup.Item value="tjs">Сомони</ButtonGroup.Item>
            <ButtonGroup.Item value="usd">Доллар</ButtonGroup.Item>
            <ButtonGroup.Item value="eur" disabled>Евро</ButtonGroup.Item>
        </ButtonGroup>
    ),
};

/** Значение снаружи: приходит пропом и меняется в `onChange`. */
export const Управляемая: Story = {
    render: function Controlled() {
        const [value, setValue] = useState('cash');

        return (
            <div style={{display: 'grid', gap: '1rem', justifyItems: 'start'}}>
                <ButtonGroup label="Способ оплаты" value={value} onChange={setValue}>
                    <ButtonGroup.Item value="cash">В кассе</ButtonGroup.Item>
                    <ButtonGroup.Item value="card">Картой</ButtonGroup.Item>
                </ButtonGroup>

                <p>Выбрано: {value}</p>
                <button type="button" onClick={() => setValue('card')}>Выбрать «Картой» снаружи</button>
            </div>
        );
    },
};

/** Значение уходит в форму как у любой группы переключателей. */
export const ВФорме: Story = {
    render: () => (
        <form
            style={{display: 'grid', gap: '1rem', justifyItems: 'start'}}
            onSubmit={event => {
                event.preventDefault();
                alert(new FormData(event.currentTarget).get('pay'));
            }}
        >
            <ButtonGroup label="Способ оплаты" name="pay" defaultValue="cash">
                <ButtonGroup.Item value="cash">В кассе</ButtonGroup.Item>
                <ButtonGroup.Item value="card">Картой</ButtonGroup.Item>
            </ButtonGroup>

            <button type="submit">Показать значение</button>
        </form>
    ),
};

/**
 * Длинный набор не переносится, а прокручивается: перенос разорвал бы коробку.
 *
 * Крутить можно обычным колесом мыши, без Shift — полоса перехватывает
 * вертикальный жест. На краю прокрутка возвращается странице.
 */
export const МногоВариантов: Story = {
    render: () => (
        <div style={{maxInlineSize: '320px'}}>
            <ButtonGroup label="Месяц" name="month" defaultValue="jan">
                {['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'].map((month, index) => (
                    <ButtonGroup.Item key={month} value={['jan', 'feb', 'mar', 'apr', 'may', 'jun'][index]}>
                        {month}
                    </ButtonGroup.Item>
                ))}
            </ButtonGroup>
        </div>
    ),
};

/** Вид LINE: кнопки в строку, под активной линия. Та же оболочка, что у Tabs. */
export const Линия: Story = {
    render: () => (
        <ButtonGroup label="Период" name="period-line" defaultValue="month" variant="LINE">
            <ButtonGroup.Item value="week">Неделя</ButtonGroup.Item>
            <ButtonGroup.Item value="month">Месяц</ButtonGroup.Item>
            <ButtonGroup.Item value="year">Год</ButtonGroup.Item>
        </ButtonGroup>
    ),
};

/**
 * Видимая подпись стоит НАД коробкой отдельной строкой, а не внутри неё:
 * `fieldset` здесь без фона, фон у вложенной оболочки. Иначе `legend`
 * занял бы место между краем коробки и кнопками — он обязан быть первым
 * ребёнком `fieldset`.
 */
export const ПодписьНадКоробкой: Story = {
    render: () => (
        <div style={{display: 'grid', gap: '1.5rem', justifyItems: 'start'}}>
            <ButtonGroup label="Период" name="p1" defaultValue="month" showLabel>
                <ButtonGroup.Item value="week">Неделя</ButtonGroup.Item>
                <ButtonGroup.Item value="month">Месяц</ButtonGroup.Item>
            </ButtonGroup>

            <ButtonGroup label="Период" name="p2" defaultValue="month" showLabel variant="LINE">
                <ButtonGroup.Item value="week">Неделя</ButtonGroup.Item>
                <ButtonGroup.Item value="month">Месяц</ButtonGroup.Item>
            </ButtonGroup>
        </div>
    ),
};
