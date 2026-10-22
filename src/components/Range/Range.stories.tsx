import {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {Range} from './Range';

const meta = {
    title: 'Формы/Range',
    component: Range,
    args: {label: 'Громкость', min: 0, max: 100},
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `Внутри настоящий \`<input type="range">\` — один или два. От него даром
достаётся роль \`slider\`, границы и значение в дереве доступности, стрелки, Home,
End, Page Up/Down, перетаскивание мышью, пальцем и пером, участие в форме
и перевод на язык системы.

Ширина берётся у контейнера. Там, где контейнер считает размер по содержимому,
ползунок просит \`--range-min\` (по умолчанию 16rem) — иначе он схлопывался бы
до ширины подписи; замерено, 121px.

Своей остаётся картинка: замерено в Chromium 141, что ни \`appearance: base\`,
ни \`::slider-thumb\` ещё нет, поэтому дорожку, заливку и шарики рисует обёртка,
а поля лежат поверх прозрачным слоем ввода.

У пары поля лежат друг на друге, и курсор достаётся верхнему — замерено, без
разделения перетаскивание левого шарика двигало правый. Разводит их \`clip-path\`
по середине между значениями: он влияет на попадание курсора, а начатое
перетаскивание не ломает — браузер на это время захватывает указатель.`,
            },
        },
    },
} satisfies Meta<typeof Range>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Обычный ползунок: шаг 10 от 10 до 120, как в примере из задачи. */
export const Шагом: Story = {
    args: {label: 'Громкость', min: 10, max: 120, step: 10, defaultValue: 50},
};

/**
 * Точки на шкале. Сами по себе они ничего не ограничивают — это разметка:
 * засечки на дорожке и подписи под ней.
 */
export const СТочками: Story = {
    args: {label: 'Срок', min: 0, max: 10, marks: [2, 4, 8], defaultValue: 4},
};

/**
 * С притяжкой значение берётся только из точек и краёв шкалы: 0, 2, 4, 8, 10.
 *
 * Клавиатура при этом шагает к соседней точке, а не на `step`: иначе стрелка
 * сдвигала бы значение на единицу, притяжка возвращала бы его в ту же точку,
 * и ползунок стоял бы на месте.
 */
export const СПритяжкой: Story = {
    args: {label: 'Срок', min: 0, max: 10, marks: [2, 4, 8], snap: true, defaultValue: 0},
};

/** Своя подпись точки уходит и под шкалу, и в `aria-valuetext`. */
export const ПодписанныеТочки: Story = {
    args: {
        label: 'Класс обслуживания',
        min: 0,
        max: 10,
        snap: true,
        defaultValue: 5,
        marks: [
            {value: 0, label: 'эконом'},
            {value: 5, label: 'комфорт'},
            {value: 10, label: 'бизнес'},
        ],
    },
};

/** Пара значений: массив вместо числа, второго пропа для этого нет. */
export const Пара: Story = {
    render: () => <Range label="Цена" min={0} max={1000} step={50} defaultValue={[200, 800]}/>,
};

/** Управляемая пара: значения живут в состоянии страницы. */
export const ПараСнаружи: Story = {
    render: function Controlled() {
        const [value, setValue] = useState<[number, number]>([200, 800]);

        return <>
            <Range
                label="Цена" min={0} max={1000} step={50}
                value={value} onChange={setValue}
                format={one => `${one} ₽`}
            />
            <p>От {value[0]} ₽ до {value[1]} ₽</p>
        </>;
    },
};

/** Пара с притяжкой: оба шарика ходят только по точкам. */
export const ПараСТочками: Story = {
    render: () => (
        <Range
            label="Срок" min={0} max={12} snap defaultValue={[3, 9]}
            marks={[3, 6, 9]} thumbs={['с', 'по']} format={one => `${one} мес.`}
        />
    ),
};

/**
 * Наименьший промежуток между «от» и «до»: шарики не сходятся ближе,
 * чем на `minDifference`.
 *
 * Предел объявлен и в дереве доступности — `aria-valuemax` младшего
 * шарика на промежуток меньше значения старшего, так что скринридер
 * называет ту же границу, в которую упирается мышь.
 */
export const СПромежутком: Story = {
    render: function Gap() {
        const [value, setValue] = useState<[number, number]>([200, 800]);

        return <>
            <Range
                label="Цена" min={0} max={1000} step={50} minDifference={200}
                value={value} onChange={setValue} format={one => `${one} ₽`}
            />
            <p>Разница: {value[1] - value[0]} ₽, меньше 200 не станет</p>
        </>;
    },
};

/** Шарики упираются друг в друга: «от» никогда не больше «до». */
export const ПараВстык: Story = {
    render: () => <Range label="Диапазон" min={0} max={100} defaultValue={[50, 50]}/>,
};

/** Выключенный: не ловит курсор, выпадает из табуляции и из формы. */
export const Выключенный: Story = {
    args: {label: 'Громкость', defaultValue: 40, disabled: true},
};

/** Своя ошибка: собственной проверки у ползунка нет — значение всегда в границах. */
export const СОшибкой: Story = {
    args: {label: 'Бюджет', defaultValue: 10, error: 'Меньше минимального заказа'},
};

/** Размеры — переменные, а не зашитая раскладка. */
export const СвойРазмер: Story = {
    render: () => (
        <Range
            label="Толщина" min={0} max={10} defaultValue={6} marks={[5]}
            style={{'--range-thumb': '2rem', '--range-track': '10px'} as React.CSSProperties}
        />
    ),
};
