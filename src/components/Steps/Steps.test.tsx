import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {describe, expect, it, vi} from 'vitest';
import {Flow} from '../Flow/Flow';
import {useFlow} from '../Flow/Flow.context.ts';
import {Steps} from './Steps';
import type {Step} from './Steps.interface.ts';

/*
 * Разметка, состояния, нажимаемость и связка с Flow. Чего здесь нет:
 * вида — кружки, линии и сокращение подписей на узком месте делают CSS
 * и @container, и они замерены в Chromium 141 (см. шапку модуля).
 */

const ШАГИ: Step[] = [
    {label: 'Личные данные', description: 'ФИО, ИИН, телефон'},
    {label: 'Доход', description: 'Работодатель и зарплата'},
    {label: 'Документы', description: 'Удостоверение'},
    {label: 'Подписание', description: 'Подтверждение по SMS'},
];

/** Состояния делений по порядку. */
function состояния(container: HTMLElement) {
    return [...container.querySelectorAll('li')].map(li => li.dataset.state);
}

describe('Steps: разметка', () => {
    it('это нумерованный список с именем', () => {
        const {container} = render(<Steps items={ШАГИ} current={0}/>);

        expect(container.querySelector('ol')).not.toBeNull();
        expect(screen.getByLabelText('Шаги')).toBeInTheDocument();
        expect(container.querySelectorAll('li')).toHaveLength(4);
    });

    it('пустой список не рисуется вовсе', () => {
        const {container} = render(<Steps items={[]}/>);

        expect(container.firstChild).toBeNull();
    });

    it('текущее деление помечено aria-current', () => {
        const {container} = render(<Steps items={ШАГИ} current={2}/>);
        const current = container.querySelectorAll('[aria-current="step"]');

        expect(current).toHaveLength(1);
        expect(current[0].textContent).toContain('Документы');
    });

    it('состояние приходит словом, а не одним цветом', () => {
        /* Цвет и фигуру скринридер не читает: WCAG 1.4.1. */
        render(<Steps items={ШАГИ} current={1}/>);

        expect(screen.getByText('Шаг 1 из 4, пройден')).toBeInTheDocument();
        expect(screen.getByText('Шаг 2 из 4, текущий шаг')).toBeInTheDocument();
        expect(screen.getByText('Шаг 4 из 4')).toBeInTheDocument();
    });

    it('подписи состояний меняются', () => {
        render(<Steps items={ШАГИ} current={1} labels={{current: 'you are here', step: (i, n) => `${i + 1}/${n}`}}/>);

        expect(screen.getByText('2/4, you are here')).toBeInTheDocument();
    });

    it('свой класс не вытесняет собственный', () => {
        const {container} = render(<Steps items={ШАГИ} current={0} className="мой"/>);
        const node = container.firstElementChild as HTMLElement;

        expect(node.className).toContain('мой');
        expect(node.className.split(' ').length).toBeGreaterThan(1);
    });
});

describe('Steps: состояния', () => {
    it('до текущего — пройдено, после — впереди', () => {
        const {container} = render(<Steps items={ШАГИ} current={2}/>);

        expect(состояния(container)).toEqual(['done', 'done', 'current', 'next']);
    });

    it('пройденные задаются прямо: путь не обязан быть прямым', () => {
        const {container} = render(<Steps items={ШАГИ} current={3} done={[0, 2]}/>);

        expect(состояния(container)).toEqual(['done', 'next', 'done', 'current']);
    });

    it('ошибка сильнее места в списке', () => {
        const {container} = render(
            <Steps current={2} items={[ШАГИ[0], {...ШАГИ[1], error: true}, ШАГИ[2], ШАГИ[3]]}/>,
        );

        expect(состояния(container)).toEqual(['done', 'error', 'current', 'next']);
    });

    it('текст ошибки вытесняет пояснение: он важнее', () => {
        render(<Steps current={0} items={[{...ШАГИ[0], error: 'Проверьте ИИН'}]}/>);

        expect(screen.getByText('Проверьте ИИН')).toBeInTheDocument();
        expect(screen.queryByText('ФИО, ИИН, телефон')).toBeNull();
    });

    it('ошибка слышна, а не только видна', () => {
        render(<Steps current={1} items={[{...ШАГИ[0], error: true}, ШАГИ[1]]}/>);

        expect(screen.getByText('Шаг 1 из 2, ошибка')).toBeInTheDocument();
    });
});

describe('Steps: что в кружке', () => {
    it('по умолчанию номер, а у пройденного галочка', () => {
        const {container} = render(<Steps items={ШАГИ} current={2}/>);
        const кружки = [...container.querySelectorAll('li')].map(li => li.firstElementChild!.firstElementChild!);

        /* У пройденных — svg вместо числа, у текущего и будущих — номер. */
        expect(кружки[0].querySelector('svg')).not.toBeNull();
        expect(кружки[2].textContent).toBe('3');
        expect(кружки[3].textContent).toBe('4');
    });

    it('doneIcon={false} оставляет номер и пройденному', () => {
        const {container} = render(<Steps items={ШАГИ} current={2} doneIcon={false}/>);
        const первый = container.querySelector('li')!.firstElementChild!.firstElementChild!;

        expect(первый.textContent).toBe('1');
    });

    it('ident узлом заменяет номер у всех', () => {
        const {container} = render(<Steps items={ШАГИ} current={0} ident={<i data-test="точка"/>} doneIcon={false}/>);

        expect(container.querySelectorAll('[data-test="точка"]')).toHaveLength(4);
    });

    it('свой значок шага сильнее общего', () => {
        const {container} = render(
            <Steps current={0} ident={<i data-test="общий"/>} items={[{...ШАГИ[0], icon: <i data-test="свой"/>}, ШАГИ[1]]}/>,
        );

        expect(container.querySelector('[data-test="свой"]')).not.toBeNull();
        expect(container.querySelectorAll('[data-test="общий"]')).toHaveLength(1);
    });

    it('ident={false} убирает кружки вовсе и помечает шкалу полосами', () => {
        const {container} = render(<Steps items={ШАГИ} current={1} ident={false}/>);
        const ol = container.firstElementChild as HTMLElement;

        expect(ol.dataset.ident).toBe('bar');
        /* Подписи остаются: полосы их не отменяют. */
        expect(screen.getByText('Доход')).toBeInTheDocument();
    });

    it('кружок спрятан от скринридера: номер — рисунок', () => {
        const {container} = render(<Steps items={ШАГИ} current={0}/>);
        const кружок = container.querySelector('li')!.firstElementChild!.firstElementChild!;

        expect(кружок).toHaveAttribute('aria-hidden', 'true');
    });
});

describe('Steps: нажимаемость', () => {
    it('по умолчанию это показатель, а не навигация', () => {
        render(<Steps items={ШАГИ} current={2}/>);

        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('с обработчиком нажимаются пройденные и текущий, но не будущие', () => {
        render(<Steps items={ШАГИ} current={2} onStepClick={() => undefined}/>);

        expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    it('обработчик получает номер и сам шаг', async () => {
        const user = userEvent.setup();
        const onStepClick = vi.fn();
        render(<Steps items={ШАГИ} current={2} onStepClick={onStepClick}/>);

        await user.click(screen.getByRole('button', {name: /Личные данные/}));

        expect(onStepClick).toHaveBeenCalledTimes(1);
        expect(onStepClick.mock.calls[0][0]).toBe(0);
        expect(onStepClick.mock.calls[0][1]).toEqual(ШАГИ[0]);
    });

    it('выключенный шаг не нажимается', () => {
        render(
            <Steps
                current={2}
                onStepClick={() => undefined}
                items={[{...ШАГИ[0], disabled: true}, ШАГИ[1], ШАГИ[2], ШАГИ[3]]}
            />,
        );

        expect(screen.queryByRole('button', {name: /Личные данные/})).toBeNull();
        expect(screen.getAllByRole('button')).toHaveLength(2);
    });
});

describe('Steps: внутри Flow', () => {
    function Stage() {
        const {goNextStep} = useFlow();

        return <button type="button" onClick={() => void goNextStep()}>Дальше</button>;
    }

    function Frame({children}: {children: React.ReactNode}) {
        return (
            <>
                <Steps clickable/>
                {children}
            </>
        );
    }

    const ПРОЦЕСС = [
        {name: 'city', component: Stage, title: 'Город'},
        {name: 'sum', component: Stage, title: 'Сумма'},
        {name: 'check', component: Stage, title: 'Проверка'},
    ];

    it('без пропсов берёт шаги, текущий и путь у процесса', async () => {
        const user = userEvent.setup();
        const {container} = render(<Flow steps={ПРОЦЕСС} initial={{}} layout={Frame}/>);

        expect(состояния(container)).toEqual(['current', 'next', 'next']);
        expect(screen.getByText('Город')).toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: 'Дальше'}));

        await waitFor(() => expect(состояния(container)).toEqual(['done', 'current', 'next']));
    });

    it('щелчок по пройденному возвращает процесс назад', async () => {
        const user = userEvent.setup();
        const {container} = render(<Flow steps={ПРОЦЕСС} initial={{}} layout={Frame}/>);

        await user.click(screen.getByRole('button', {name: 'Дальше'}));
        await waitFor(() => expect(состояния(container)).toEqual(['done', 'current', 'next']));

        await user.click(screen.getByRole('button', {name: /Город/}));

        await waitFor(() => expect(состояния(container)).toEqual(['current', 'done', 'next']));
    });

    it('переданные пропсы сильнее процесса', () => {
        const {container} = render(
            <Flow
                steps={ПРОЦЕСС}
                initial={{}}
                layout={({children}) => (
                    <>
                        <Steps items={ШАГИ} current={3}/>
                        {children}
                    </>
                )}
            />,
        );

        expect(состояния(container)).toEqual(['done', 'done', 'done', 'current']);
    });
});

describe('Steps: доступность', () => {
    it('проходит axe в обоих положениях и обоих видах', async () => {
        for (const orientation of ['HORIZONTAL', 'VERTICAL'] as const) {
            for (const ident of [true, false] as const) {
                const {container, unmount} = render(
                    <Steps items={ШАГИ} current={1} orientation={orientation} ident={ident}/>,
                );

                expect((await axe.run(container, {rules: {'color-contrast': {enabled: false}}})).violations).toEqual([]);
                unmount();
            }
        }
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Steps items={ШАГИ} current={1} onStepClick={() => undefined}/>);

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
