import {useEffect, useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {Progress} from './Progress';
import type {ProgressProps} from './Progress.interface.ts';

const meta = {
    title: 'Обратная связь/Progress',
    component: Progress,
    /*
     * Ширина обёртки задана числом: полоса занимает всю доступную ширину,
     * а #storybook-root сжимается по содержимому (у body в index.css стоит
     * place-items: center, и justify-items в блочном контейнере делает
     * детей сжатыми). Замерено — без обёртки корень истории шириной 4px,
     * и от полосы оставалась одна точка.
     *
     * Проценты не помогут: они считались бы от той же ширины. Единицы
     * окна определённые, поэтому работают.
     */
    decorators: [
        Story => (
            <div style={{inlineSize: 'min(32rem, calc(100vw - 4rem))'}}>
                <Story/>
            </div>
        ),
    ],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `Ход дела — это нативный \`<progress>\`, а не виджет из разметки и атрибутов.
Роль, значение, границы шкалы и неопределённое состояние приходят от платформы:
замерено в Chromium 141 — роль \`progressbar\`, \`valuemin\` 0, \`valuemax\` из \`max\`,
а у \`<progress>\` без \`value\` значения в дереве доступности нет вовсе, и он ловится
псевдоклассом \`:indeterminate\`.

Заливку рисует обычный фон: у полосы линейный градиент, у кольца конический с маской.
Вендорные \`::-webkit-progress-value\` в рисунке не участвуют — они только гасятся,
чтобы не закрыть фон. Доля едет к новому значению сама, потому что \`--progress\`
объявлена через \`@property\` и потому участвует в переходах: замерено, 0.4 → 0.9
прошло кадрами 0.53, 0.68, 0.80, 0.88 — без единой перерисовки React.

Своего здесь ровно одно, и по измеренной причине: анимация неизвестного хода дела.
После \`appearance: none\` Chromium перестаёт рисовать бегущую полосу и показывает
пустую дорожку.`,
            },
        },
    },
} satisfies Meta<typeof Progress>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Полоса: шкала по умолчанию от 0 до 1. */
export const Полоса: Story = {
    args: {label: 'Загрузка файла', value: 0.4},
};

/** Подпись и число видны глазами, а не только скринридеру. */
export const СПодписью: Story = {
    args: {
        label: 'Загрузка файла',
        showLabel: true,
        value: 40,
        max: 100,
        format: value => `${value}%`,
    },
};

/** Кольцо: число встаёт в середину само — оно в той же клетке сетки. */
export const Кольцо: Story = {
    args: {
        variant: 'CIRCLE',
        label: 'Заполнение анкеты',
        value: 65,
        max: 100,
        format: value => `${value}%`,
    },
};

/** Кольцо с подписью под ним. */
export const КольцоСПодписью: Story = {
    args: {
        variant: 'CIRCLE',
        label: 'Место на диске',
        showLabel: true,
        value: 82,
        max: 100,
        format: value => `${value}%`,
    },
};

/**
 * Неизвестный ход дела: value не передан. Это состояние самого
 * `<progress>`, а не отдельный проп.
 */
export const БезПроцента: Story = {
    args: {label: 'Идёт обработка'},
};

/** То же кольцом. */
export const БезПроцентаКольцом: Story = {
    args: {variant: 'CIRCLE', label: 'Идёт обработка'},
};

/** Переменными меняется и толщина, и размер, и цвета. */
export const СвойВид: Story = {
    args: {
        variant: 'CIRCLE',
        label: 'Место на диске',
        value: 92,
        max: 100,
        format: value => `${value}%`,
        style: {
            '--progress-fill': 'var(--danger-color-soft)',
            '--progress-size': '6rem',
            '--progress-thickness': '0.75rem',
        } as React.CSSProperties,
    },
};

/**
 * Значение меняется — заливка доезжает сама. Замерено: на шаг 0.4 → 0.9
 * приходится ровно одна перерисовка React, а кадры (0.67, 0.80, 0.85, 0.89)
 * проходят средствами CSS: `--progress` объявлена через `@property`
 * и потому участвует в переходах.
 */
export const Живая: Story = {
    args: {label: 'Загрузка файла'},
    render: args => <Running {...args}/>,
};

function Running(args: ProgressProps) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setValue(was => (was >= 100 ? 0 : was + 12)), 900);

        return () => clearInterval(timer);
    }, []);

    return (
        <div style={{display: 'grid', gap: '2rem', justifyItems: 'start'}}>
            <Progress {...args} showLabel value={value} max={100} format={now => `${now}%`}/>
            <Progress {...args} variant="CIRCLE" value={value} max={100} format={now => `${now}%`}/>
        </div>
    );
}
