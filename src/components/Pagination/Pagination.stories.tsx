import {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {Pagination} from './Pagination';
import type {PaginationProps} from './Pagination.interface.ts';

const meta = {
    title: 'Навигация/Pagination',
    component: Pagination,
    /*
     * Ширина задаётся числом, а не процентами. Пагинация — размерный
     * контейнер: своей ширины по содержимому у неё нет, а #storybook-root
     * сжимается по содержимому (у body в index.css стоит place-items:
     * center, и justify-items в блочном контейнере делает детей сжатыми).
     * Замерено — без этой обёртки корень истории шириной 0 при body
     * в 1185px, и пятнадцать кнопок встают в пятнадцать строк.
     *
     * 100% здесь не спасёт: проценты считались бы от той же нулевой
     * ширины. Единицы окна определённые, поэтому работают.
     */
    decorators: [
        Story => (
            <div style={{inlineSize: 'min(60rem, calc(100vw - 4rem))'}}>
                <Story/>
            </div>
        ),
    ],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `Постраничная навигация — это \`<nav>\` со списком ссылок, а не ряд кнопок.
Пагинация — ориентир: скринридер обязан находить её среди ориентиров и перескакивать
к ней одним движением. Текущая страница помечена \`aria-current="page"\` — другого
aria-состояния для «вы здесь» не существует.

Сами кнопки и ссылки — общий \`Button\`: кольцо фокуса, выключенное состояние, размер
цели нажатия и поведение в высоком контрасте у пагинации не свои.

Сколько номеров видно, решает ширина самой пагинации, а не окна: \`@container\`
прячет номера за узким окном, а многоточие, которое должно появиться на их месте,
отрисовано заранее. Ни замеров в JS, ни наблюдателя за размером, ни перерисовок
при изменении ширины.`,
            },
        },
    },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

function Live({page: start = 1, ...args}: PaginationProps) {
    const [page, setPage] = useState(start);

    return <Pagination {...args} page={page} onChange={setPage}/>;
}

/** Кнопки: страница живёт в состоянии, адрес не меняется. */
export const Кнопками: Story = {
    args: {page: 1, total: 20},
    render: args => <Live {...args}/>,
};

/**
 * Ссылки: номер страницы — настоящий адрес. Открывается в соседней вкладке,
 * копируется, виден поисковику и работает без JS.
 */
export const Ссылками: Story = {
    args: {page: 7, total: 20, href: page => `?страница=${page}`},
};

/** Середина длинного списка: края, многоточия и окно вокруг текущей. */
export const Середина: Story = {
    args: {page: 10, total: 40},
    render: args => <Live {...args}/>,
};

/** Начало: назад идти некуда, и обе левые стрелки выключены. */
export const Начало: Story = {
    args: {page: 1, total: 40},
};

/** Конец: выключены правые. */
export const Конец: Story = {
    args: {page: 40, total: 40},
};

/** Только номера, без стрелок. */
export const БезСтрелок: Story = {
    args: {page: 10, total: 20, arrows: false, edges: false},
};

/** Только стрелки и надпись — для узких мест, где номера не нужны вовсе. */
export const ТолькоСтрелки: Story = {
    args: {page: 10, total: 20, siblings: 0, boundaries: 0},
    render: args => <Live {...args}/>,
};

/** Сколько номеров по сторонам и по краям — пропами. */
export const СвояШирина: Story = {
    args: {page: 20, total: 40, siblings: 3, boundaries: 2},
};

/**
 * Узкое место: ширину решает сама пагинация, а не окно. Подвиньте
 * разделитель — на 30rem окно вокруг текущей страницы станет уже,
 * а на месте спрятанных номеров появится многоточие.
 */
export const ВУзкойКолонке: Story = {
    args: {page: 10, total: 40},
    render: args => (
        <div style={{display: 'grid', gap: '2rem'}}>
            <div style={{inlineSize: '100%'}}><Pagination {...args}/></div>
            <div style={{inlineSize: '28rem'}}><Pagination {...args}/></div>
            <div style={{inlineSize: '22rem'}}><Pagination {...args}/></div>
        </div>
    ),
};

/** Надпись своя, подписи кнопок — тоже. */
export const СвоиПодписи: Story = {
    args: {
        page: 3,
        total: 12,
        label: 'Pages',
        status: (page, total) => `${page} / ${total}`,
        labels: {
            page: page => `Page ${page}`,
            first: 'First page',
            previous: 'Previous page',
            next: 'Next page',
            last: 'Last page',
        },
    },
};

/** Одна страница — навигация не рисуется вовсе. */
export const ОднаСтраница: Story = {
    args: {page: 1, total: 1},
};
