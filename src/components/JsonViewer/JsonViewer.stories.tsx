import type {Meta, StoryObj} from '@storybook/react-vite';
import {JsonViewer} from './JsonViewer';

const ОТВЕТ = {
    имя: 'Рубль',
    код: 643,
    активна: true,
    списана: null,
    курс: {покупка: 1.1, продажа: 1.2, история: [1.05, 1.08, 1.1]},
    страны: ['RU', 'KZ'],
    пусто: {},
    тожеПусто: [],
};

/** Сотни узлов: тот размер, под который компонент и делался. */
const БОЛЬШОЙ = {
    счета: Array.from({length: 60}, (_, index) => ({
        id: index,
        номер: `KZ${String(index).padStart(16, '0')}`,
        валюта: index % 2 === 0 ? 'KZT' : 'USD',
        остаток: index * 1234.5,
        закрыт: index % 7 === 0,
        владелец: {фамилия: 'Иванов', имя: 'Иван', документ: {тип: 'паспорт', номер: index}},
    })),
};

const meta = {
    title: 'Данные/JsonViewer',
    component: JsonViewer,
    decorators: [
        Story => (
            <div style={{inlineSize: 'min(44rem, calc(100vw - 4rem))'}}>
                <Story/>
            </div>
        ),
    ],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `Дерево JSON со сворачиванием. Сворачивают нативные \`<details>\` и \`<summary>\`:
клавиатура и роль с состоянием «развёрнут» приходят от платформы, а весь вид свёрнутого
и раскрытого узла держится на правиле \`details[open]\` — состояния в React для этого нет,
и раскрытие не вызывает перерисовки.

Узел — настоящий компонент, а не функция-помощник. Иначе \`useState\` внутри считался бы
по порядку вызова, число вызовов зависело бы от формы данных, и первое же изменение JSON
отдавало бы одному узлу состояние другого.

Запятые рисует разметка, а не \`::after\`: так они попадают в выделение и в копию,
и из просмотра можно вставить кусок как JSON.

Замерено в Chromium 141: дерево из шестидесяти счетов в закрытом виде — 25 элементов
разметки, в раскрытом — 4644, разворачивается целиком за 62мс. Содержимое закрытых веток
по умолчанию не рисуется; цена — поиск по странице их не находит, и для него есть
\`lazy={false}\`.`,
            },
        },
    },
} satisfies Meta<typeof JsonViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** По умолчанию раскрыт корень и его прямые дети. */
export const Ответ: Story = {
    args: {value: ОТВЕТ},
};

/** Всё свёрнуто: видно только, сколько внутри. */
export const Свёрнуто: Story = {
    args: {value: ОТВЕТ, defaultDepth: 0},
};

/** Всё раскрыто сразу. */
export const Раскрыто: Story = {
    args: {value: ОТВЕТ, defaultDepth: Infinity},
};

/** Без кнопок: действия над деревом сделаете свои. */
export const БезКнопок: Story = {
    args: {value: ОТВЕТ, toolbar: false},
};

/** Большой ответ. Раскройте всё и посмотрите, как держится. */
export const Большой: Story = {
    args: {value: БОЛЬШОЙ, defaultDepth: 1},
};

/**
 * `lazy={false}` рисует и закрытые ветки. Тогда их находит поиск
 * по странице — замерено, текст в закрытом `<details>` поиск видит,
 * когда он есть в разметке.
 */
export const ДляПоиска: Story = {
    args: {value: БОЛЬШОЙ, defaultDepth: 0, lazy: false},
};

/** Счётчик и подписи кнопок — свои. */
export const СвоиПодписи: Story = {
    args: {
        value: ОТВЕТ,
        defaultDepth: 0,
        count: (length, kind) => `${length} ${kind === 'array' ? 'items' : 'keys'}`,
        labels: {expand: 'Expand all', collapse: 'Collapse all', copy: 'Copy', copied: 'Copied'},
    },
};

/** Простое значение в корне — тоже допустимый JSON. */
export const ОдноЗначение: Story = {
    args: {value: 'просто строка', toolbar: false},
};
