import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {createRef, useRef} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Button} from '../Button/Button';
import {Popover} from './Popover';

/*
 * Здесь проверяется только то, что компонент кладёт в DOM: атрибуты, имя
 * для скринридера, переменные раскладки, отсутствие лишних перерисовок.
 *
 * Геометрии тут нет и быть не может: jsdom ничего не раскладывает, а
 * position-area, привязка к якорю и переворот у края экрана — это работа
 * движка. Их место в браузерных замерах, а не здесь.
 */

function open(id: string) {
    return document.getElementById(id)!.matches(':popover-open');
}

describe('Popover', () => {
    it('рендерит div с popover="auto" по умолчанию', () => {
        render(<Popover id="p">Контент</Popover>);
        const popover = document.getElementById('p')!;
        expect(popover.tagName).toBe('DIV');
        expect(popover).toHaveAttribute('popover', 'auto');
    });

    it('не перебивает явно заданный popover', () => {
        render(<Popover id="p" popover="manual">Контент</Popover>);
        expect(document.getElementById('p')).toHaveAttribute('popover', 'manual');
    });

    it('label становится именем для скринридера', () => {
        render(<Popover id="p" label="Меню пользователя">Контент</Popover>);
        expect(document.getElementById('p')).toHaveAttribute('aria-label', 'Меню пользователя');
    });

    it('без label атрибут не появляется вовсе', () => {
        render(<Popover id="p">Контент</Popover>);
        // пустой aria-label хуже отсутствующего: он стирает имя из содержимого
        expect(document.getElementById('p')).not.toHaveAttribute('aria-label');
    });

    it('роль не навязывается, но пробрасывается', () => {
        const {rerender} = render(<Popover id="p">Контент</Popover>);
        expect(document.getElementById('p')).not.toHaveAttribute('role');
        rerender(<Popover id="p" role="dialog" label="Окно">Контент</Popover>);
        expect(document.getElementById('p')).toHaveAttribute('role', 'dialog');
    });

    it('принимает ref без forwardRef (React 19)', () => {
        const ref = createRef<HTMLDivElement>();
        render(<Popover id="p" ref={ref}>Контент</Popover>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
        expect(ref.current).toHaveAttribute('id', 'p');
    });

    it('сохраняет пользовательский className рядом со своим', () => {
        render(<Popover id="p" className="my-own">Контент</Popover>);
        const popover = document.getElementById('p')!;
        expect(popover).toHaveClass('my-own');
        // свой класс модуля тоже на месте
        expect(popover.className.split(' ').length).toBeGreaterThan(1);
    });

    /* ---------------------------------------------------------------- */
    /*  Раскладка: единственная настоящая логика компонента             */
    /* ---------------------------------------------------------------- */

    it.each([
        ['block-end', 'block-end span-inline-end', 'top center'],
        ['block-start', 'block-start span-inline-end', 'bottom center'],
        ['inline-end', 'inline-end span-block-end', 'center left'],
        ['inline-start', 'inline-start span-block-end', 'center right'],
    ] as const)('placement="%s" задаёт область и точку роста', (placement, area, origin) => {
        render(<Popover id="p" placement={placement}>Контент</Popover>);
        const style = document.getElementById('p')!.style;
        expect(style.getPropertyValue('--popover-area')).toBe(area);
        expect(style.getPropertyValue('--popover-origin')).toBe(origin);
    });

    it('зазор до кнопки лежит на оси раскладки, а не на обеих сразу', () => {
        const {rerender} = render(<Popover id="p" placement="block-end">Контент</Popover>);
        let style = document.getElementById('p')!.style;
        // обычная раскладка: отступ сверху, по горизонтали ноль
        expect(style.getPropertyValue('--popover-margin-block')).toBe('var(--popover-gap) 0');
        expect(style.getPropertyValue('--popover-margin-inline')).toBe('0');

        rerender(<Popover id="p" placement="inline-end">Контент</Popover>);
        style = document.getElementById('p')!.style;
        // боковая: наоборот, иначе окно сдвигается вниз вместо отступа от кнопки
        expect(style.getPropertyValue('--popover-margin-block')).toBe('0');
        expect(style.getPropertyValue('--popover-margin-inline')).toBe('var(--popover-gap) 0');
    });

    it('без пропа anchor переменная якоря не ставится', () => {
        render(<Popover id="p">Контент</Popover>);
        // CSS читает var(--popover-anchor, auto): пустая переменная сломала бы
        // неявный якорь, из-за которого поповер и встаёт у своей кнопки
        expect(document.getElementById('p')!.style.getPropertyValue('--popover-anchor')).toBe('');
    });

    it('anchor задаёт имя якоря', () => {
        render(<Popover id="p" anchor="--side-panel">Контент</Popover>);
        expect(document.getElementById('p')!.style.getPropertyValue('--popover-anchor')).toBe('--side-panel');
    });

    it('пользовательский style не затирается переменными раскладки', () => {
        render(<Popover id="p" style={{zIndex: 5}}>Контент</Popover>);
        const style = document.getElementById('p')!.style;
        expect(style.zIndex).toBe('5');
        expect(style.getPropertyValue('--popover-area')).not.toBe('');
    });

    /* ---------------------------------------------------------------- */
    /*  Открытие разметкой                                              */
    /* ---------------------------------------------------------------- */

    it('кнопка с popoverTarget открывает и закрывает', async () => {
        render(
            <>
                <Button popoverTarget="p">Открыть</Button>
                <Popover id="p" label="Окно">Контент</Popover>
            </>,
        );
        expect(open('p')).toBe(false);
        await userEvent.click(screen.getByRole('button', {name: 'Открыть'}));
        expect(open('p')).toBe(true);
        await userEvent.click(screen.getByRole('button', {name: 'Открыть'}));
        expect(open('p')).toBe(false);
    });

    it('popoverTargetAction="hide" только закрывает', async () => {
        render(
            <>
                <Button popoverTarget="p">Открыть</Button>
                <Popover id="p" label="Окно">
                    <Button popoverTarget="p" popoverTargetAction="hide">Закрыть</Button>
                </Popover>
            </>,
        );
        await userEvent.click(screen.getByRole('button', {name: 'Открыть'}));
        expect(screen.getByRole('button', {name: 'Закрыть'})).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', {name: 'Закрыть'}));
        expect(open('p')).toBe(false);
    });

    it('содержимое закрытого поповера скрыто от скринридера', async () => {
        render(
            <>
                <Button popoverTarget="p">Открыть</Button>
                <Popover id="p" label="Окно">
                    <Button popoverTarget="p" popoverTargetAction="hide">Закрыть</Button>
                </Popover>
            </>,
        );
        // закрытый поповер не отображается, и его кнопка не должна попадать
        // ни в порядок фокуса, ни в дерево доступности
        expect(screen.queryByRole('button', {name: 'Закрыть'})).toBeNull();
        expect(screen.getByRole('button', {name: 'Закрыть', hidden: true})).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', {name: 'Открыть'}));
        expect(screen.queryByRole('button', {name: 'Закрыть'})).not.toBeNull();
    });

    it('открывается и закрывается через ref', () => {
        const ref = createRef<HTMLDivElement>();
        render(<Popover id="p" popover="manual" ref={ref} label="Окно">Контент</Popover>);
        ref.current!.showPopover();
        expect(open('p')).toBe(true);
        ref.current!.hidePopover();
        expect(open('p')).toBe(false);
    });

    /* ---------------------------------------------------------------- */
    /*  Оптимизация                                                     */
    /* ---------------------------------------------------------------- */

    it('открытие и закрытие не вызывают ни одной перерисовки React', async () => {
        const renders = {count: 0};

        function Host() {
            renders.count += 1;

            return (
                <>
                    <Button popoverTarget="p">Открыть</Button>
                    <Popover id="p" label="Окно">Контент</Popover>
                </>
            );
        }

        render(<Host/>);
        const initial = renders.count;

        await userEvent.click(screen.getByRole('button', {name: 'Открыть'}));
        await userEvent.click(screen.getByRole('button', {name: 'Открыть'}));

        // всем распоряжается браузер: состояния нет, перерисовывать нечего
        expect(open('p')).toBe(false);
        expect(renders.count).toBe(initial);
    });

    it('не создаёт объект стиля заново при неизменных пропсах', () => {
        const styles: CSSStyleDeclaration[] = [];

        function Host({tick}: {tick: number}) {
            const seen = useRef(0);
            seen.current = tick;

            return <Popover id="p" label="Окно">Контент {tick}</Popover>;
        }

        const {rerender} = render(<Host tick={1}/>);
        styles.push({...document.getElementById('p')!.style} as CSSStyleDeclaration);
        rerender(<Host tick={2}/>);

        const style = document.getElementById('p')!.style;
        // переменные раскладки переживают перерисовку без изменений
        expect(style.getPropertyValue('--popover-area')).toBe('block-end span-inline-end');
        expect(style.getPropertyValue('--popover-origin')).toBe('top center');
    });

    /* ---------------------------------------------------------------- */
    /*  Доступность                                                     */
    /* ---------------------------------------------------------------- */

    it('связка кнопка + поповер проходит axe', async () => {
        const {container} = render(
            <>
                <Button popoverTarget="p">Открыть меню</Button>
                <Popover id="p" label="Меню пользователя" role="dialog">
                    <p>Содержимое</p>
                    <Button popoverTarget="p" popoverTargetAction="hide">Закрыть</Button>
                </Popover>
            </>,
        );

        /* Закрытый поповер скрыт, и axe его не смотрит — проверять нужно
           открытый, иначе тест проходит вхолостую. */
        await userEvent.click(screen.getByRole('button', {name: 'Открыть меню'}));
        expect(open('p')).toBe(true);

        const results = await axe.run(container, {
            /*
             * Контраст проверяется в браузере: jsdom не считает цвета, и axe
             * здесь всё равно пропустит правило. Остальные — про разметку
             * и имена, они работают и без раскладки.
             */
            rules: {'color-contrast': {enabled: false}},
        });

        expect(results.violations).toEqual([]);
    });

    it('роль без имени — предупреждение разработчику, а не молчание', () => {
        // role="dialog" без label оставит окно безымянным в дереве доступности;
        // тест фиксирует, что компонент такое не чинит сам и не скрывает
        render(<Popover id="p" role="dialog">Контент</Popover>);
        const popover = document.getElementById('p')!;
        expect(popover).toHaveAttribute('role', 'dialog');
        expect(popover).not.toHaveAttribute('aria-label');
    });

    it('содержимое не пропадает из дерева, пока поповер закрыт', () => {
        render(<Popover id="p" label="Окно"><span>Внутри</span></Popover>);
        // React ничего не размонтирует: видимостью распоряжается CSS
        expect(document.getElementById('p')!.textContent).toBe('Внутри');
    });

    it('не шумит предупреждениями React про неизвестные атрибуты', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <>
                <Button popoverTarget="p">Открыть</Button>
                <Popover id="p" label="Окно" placement="inline-end" anchor="--x">Контент</Popover>
            </>,
        );
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
