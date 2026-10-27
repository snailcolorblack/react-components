import type {Meta, StoryObj} from '@storybook/react-vite';
import {Scroll} from './Scroll';

const CARDS = Array.from({length: 14}, (_, index) => `Карточка ${index + 1}`);

const card = {
    flex: 'none',
    inlineSize: '12rem',
    blockSize: '7rem',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '0.5rem',
    background: 'var(--base-color-200)',
    border: '1px solid var(--contrast-alpha-20)',
} as const;

const strip = {display: 'flex', gap: '1rem'} as const;

const meta = {
    title: 'Раскладка/Scroll',
    component: Scroll,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `Лента с прокруткой — это обычный блок с \`overflow\`, а не виджет.
Прокрутку, инерцию, полосу, жесты трекпада и пальца, клавиши и привязку к элементам
делает браузер.

Своего здесь две вещи, и обе потому, что платформа их не делает. Первая — колесо:
Chromium не переводит вертикальное колесо в горизонтальную прокрутку (замерено —
лента стоит, уезжает страница), а слушатель приходится вешать руками и непассивным,
потому что React вешает \`wheel\` пассивно и \`preventDefault()\` в нём не действует.
Вторая — табуляция: до прокручиваемой области без фокусируемого содержимого
с клавиатуры не добраться, и Chromium, в отличие от Firefox, сам её остановкой
не делает.

Замерено в Chromium 141: щелчок колеса двигает свободную ленту на 100px, ленту
с привязкой — ровно на один элемент; на краю прокрутка уходит странице, если
не включить \`trap\`; вертикальную ленту колесо листает само; в RTL лента едет
в свою сторону.`,
            },
        },
    },
} satisfies Meta<typeof Scroll>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Свободная прокрутка: лента останавливается там, где отпустили. */
export const Свободная: Story = {
    render: () => (
        <Scroll label="Свободная лента" style={strip}>
            {CARDS.map(name => <div key={name} style={card}>{name}</div>)}
        </Scroll>
    ),
};

/**
 * С привязкой: лента всегда стоит началом элемента у начала ленты,
 * а один щелчок колеса переносит ровно на один элемент.
 */
export const СПривязкой: Story = {
    render: () => (
        <Scroll mode="fixed" label="Лента с привязкой" style={strip}>
            {CARDS.map(name => <div key={name} style={card}>{name}</div>)}
        </Scroll>
    ),
};

/**
 * Карточки-ссылки: лишней остановки табуляции не появляется — по ленте
 * ходят через сами карточки, а она едет за фокусом.
 */
export const ИзСсылок: Story = {
    render: () => (
        <Scroll mode="fixed" style={strip}>
            {CARDS.map(name => (
                <a key={name} href="#карточка" style={{...card, color: 'inherit', textDecoration: 'none'}}>{name}</a>
            ))}
        </Scroll>
    ),
};

/** Любой тег: список остаётся списком, прокрутка от этого не меняется. */
export const Списком: Story = {
    render: () => (
        <Scroll as="ul" mode="fixed" label="Список" style={{...strip, listStyle: 'none', margin: 0, padding: 0}}>
            {CARDS.map(name => <li key={name} style={card}>{name}</li>)}
        </Scroll>
    ),
};

/** Вертикальная лента: колесо здесь родное, перехватывать нечего. */
export const Вертикальная: Story = {
    render: () => (
        <Scroll
            axis="block" mode="fixed" label="Вертикальная лента"
            style={{display: 'flex', flexDirection: 'column', gap: '1rem', blockSize: '16rem'}}
        >
            {CARDS.map(name => <div key={name} style={{...card, inlineSize: 'auto'}}>{name}</div>)}
        </Scroll>
    ),
};

/**
 * С удержанием: на краю прокрутка не уходит странице. Пригодится там, где
 * лента занимает почти весь экран и мимо неё колесу всё равно не попасть;
 * в длинной странице это превратит ленту в ловушку.
 */
export const СУдержанием: Story = {
    render: () => (
        <Scroll trap label="Лента с удержанием" style={strip}>
            {CARDS.map(name => <div key={name} style={card}>{name}</div>)}
        </Scroll>
    ),
};

/**
 * Растушёвка у краёв: содержимое растворяется там, где лента продолжается.
 *
 * Показывается только с той стороны, где есть продолжение — у непрокрученной
 * ленты начала не растворяется. Ведёт растушёвку сама прокрутка: маска,
 * прозрачность краёв которой считает scroll-driven анимация. Ни обработчика,
 * ни перерисовок.
 */
export const СРастушёвкой: Story = {
    render: () => (
        <Scroll fade label="Лента с растушёвкой" style={strip}>
            {CARDS.map(name => <div key={name} style={card}>{name}</div>)}
        </Scroll>
    ),
};

/**
 * Стрелки — это `::scroll-button()`, кнопки самого браузера: он делает их
 * настоящими кнопками в дереве доступности (замерено — «Назад» и «Вперёд»),
 * сам выключает крайнюю и сам листает. Своего кода здесь нет вовсе.
 *
 * У ленты с привязкой шаг получается ровно в элемент, у свободной — почти
 * экран. Движки, которые их ещё не умеют, просто не покажут ничего.
 */
export const СоСтрелками: Story = {
    render: () => (
        <Scroll arrows fade mode="fixed" label="Лента со стрелками" style={strip}>
            {CARDS.map(name => <div key={name} style={card}>{name}</div>)}
        </Scroll>
    ),
};

/**
 * Выход за отступы родителя: лента идёт во всю ширину карточки, а первый
 * и последний элементы стоят от её краёв ровно на тот отступ, что у карточки.
 *
 * Отступ снимается с родителя один раз при отрисовке. Наблюдателя за размером
 * нет намеренно: отступ меняется редко, а считать на каждое изменение ширины
 * дорого. Там, где он всё же меняется по медиавыражению, его передают
 * строкой — `bleed="2rem"`, — и тогда не измеряется ничего.
 */
export const ЗаОтступыРодителя: Story = {
    render: () => (
        <div style={{padding: '2rem', background: 'var(--base-color-200)', borderRadius: '0.75rem'}}>
            <h3 style={{margin: '0 0 1rem'}}>Заголовок стоит по отступу</h3>
            <Scroll bleed fade arrows label="Лента во всю карточку" style={strip}>
                {CARDS.map(name => <div key={name} style={card}>{name}</div>)}
            </Scroll>
        </div>
    ),
};

/**
 * Без полосы прокрутки. Прятать её стоит только вместе с растушёвкой или
 * стрелками: полоса — единственный постоянный признак того, что лента едет.
 * Сама прокрутка остаётся всей: колесо, палец, трекпад, клавиши.
 */
export const БезПолосы: Story = {
    render: () => (
        <Scroll bar={false} fade label="Лента без полосы" style={strip}>
            {CARDS.map(name => <div key={name} style={card}>{name}</div>)}
        </Scroll>
    ),
};

/** Отступ прицепленного элемента от края — переменная, а не зашитое число. */
export const СвойОтступ: Story = {
    render: () => (
        <Scroll mode="fixed" label="Свой отступ" style={{...strip, '--scroll-padding': '3rem'} as React.CSSProperties}>
            {CARDS.map(name => <div key={name} style={card}>{name}</div>)}
        </Scroll>
    ),
};
