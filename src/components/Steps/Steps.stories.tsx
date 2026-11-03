import type {Meta, StoryObj} from '@storybook/react-vite';
import {Steps} from './Steps';
import type {Step} from './Steps.interface.ts';

const ШАГИ: Step[] = [
    {label: 'Личные данные', description: 'ФИО, ИИН, телефон'},
    {label: 'Доход', description: 'Работодатель и зарплата'},
    {label: 'Документы', description: 'Удостоверение и справка о доходах'},
    {label: 'Подписание', description: 'Подтверждение по SMS'},
];

/* Значки для демонстрации: у каждого шага свой, по смыслу шага. */
const человек = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2"/>
        <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

const кошелёк = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="2"/>
        <path d="M3 10h18" stroke="currentColor" strokeWidth="2"/>
        <circle cx="16.5" cy="14.5" r="1.4" fill="currentColor"/>
    </svg>
);

const документ = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M6 3h8l4 4v14H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

const перо = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M4 20c4-1 6-3 9-6l3-3-3-3-3 3c-3 3-5 5-6 9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M15 5l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

const ЗНАЧКИ = [человек, кошелёк, документ, перо];

const meta = {
    title: 'Навигация/Steps',
    component: Steps,
    decorators: [
        Story => (
            <div style={{inlineSize: 'min(56rem, calc(100vw - 4rem))'}}>
                <Story/>
            </div>
        ),
    ],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `Шкала шагов: где человек сейчас, что позади и сколько осталось.

Это \`<ol>\` со списком — порядок делений значим, и скринридер объявит, сколько их всего.
Текущее помечено \`aria-current="step"\`. Кружок с номером от скринридера спрятан: номер
и галочка — рисунок, а состояние приходит словом («пройден», «текущий шаг», «ошибка»),
потому что цвет и фигуру он не читает (WCAG 1.4.1).

Два положения (\`HORIZONTAL\`, \`VERTICAL\`) и три вида деления: номер, свой значок
и \`ident={false}\` — тогда кружков нет вовсе, а деления становятся отрезками полосы.

Нажимаемость — проп. По умолчанию шкала показатель, а не навигация: ни кнопок,
ни табуляции. С \`clickable\` нажимаются только пройденные деления и текущее — вперёд
по шкале не ходят, туда ведёт кнопка «Дальше» с проверкой.

Внутри \`<Flow>\` шкала работает без пропсов вовсе: шаги, текущий и пройденный путь
берёт у процесса, а с \`clickable\` сама зовёт \`goToStep\`. Подписи задаются в объявлении
шагов — полями \`title\` и \`description\`.

На узком месте (уже 30rem) подписи остаются только у текущего шага: замерено,
на 360px четыре колонки по 80px режут слова по буквам.`,
            },
        },
    },
} satisfies Meta<typeof Steps>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Как в заявке: пройденное галочкой, текущее номером. */
export const Горизонтальная: Story = {
    args: {items: ШАГИ, current: 2},
};

/** Вертикально: кружок слева, подпись справа. */
export const Вертикальная: Story = {
    args: {items: ШАГИ, current: 2, orientation: 'VERTICAL'},
    decorators: [Story => <div style={{inlineSize: 'min(24rem, 100%)'}}><Story/></div>],
};

/** Ошибка на шаге: свой силуэт, свой цвет и текст вместо пояснения. */
export const СОшибкой: Story = {
    args: {
        current: 2,
        items: [ШАГИ[0], {...ШАГИ[1], error: 'Справка не читается'}, ШАГИ[2], ШАГИ[3]],
    },
};

/** `ident={false}`: деления становятся отрезками полосы. */
export const Полосами: Story = {
    args: {items: ШАГИ, current: 2, ident: false},
};

/** Полосы вертикально. */
export const ПолосамиВертикально: Story = {
    args: {items: ШАГИ, current: 1, ident: false, orientation: 'VERTICAL'},
    decorators: [Story => <div style={{inlineSize: 'min(24rem, 100%)'}}><Story/></div>],
};

/**
 * Свой значок у каждого деления: поле `icon` у шага сильнее общего
 * `ident`, и значок остаётся даже у пройденного — его галочка
 * отключена через `doneIcon={false}`.
 */
export const СоЗначком: Story = {
    args: {
        current: 2,
        doneIcon: false,
        items: ШАГИ.map((step, index) => ({...step, icon: ЗНАЧКИ[index]})),
    },
};

/** Нажимаемая: пройденные и текущий становятся кнопками. */
export const Нажимаемая: Story = {
    args: {items: ШАГИ, current: 2, onStepClick: () => undefined},
};

/** Без пояснений — только подписи. */
export const БезПояснений: Story = {
    args: {
        current: 1,
        items: ШАГИ.map(({label}) => ({label})),
    },
};
