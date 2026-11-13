import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {Drawer} from './Drawer';
import {settle, shift} from './Drawer.drag.ts';

/*
 * Разметка, ступени, клавиатура и арифметика жеста. Чего здесь нет:
 * самого жеста и выезда — Pointer Events с захватом указателя и
 * переходы с @starting-style в jsdom не воспроизводятся. Это замерено
 * в Chromium 141 на пробной странице:
 *
 *   открытие   — панель едет снизу: верх 603 → 480 при окне 800;
 *   жест вверх — панель идёт за пальцем (440 → 390 → 340 → 280),
 *                после отпускания встаёт на следующую ступень (720px);
 *   жест вниз  — возвращает на нижнюю ступень, с неё закрывает;
 *   прокрутка  — жест по прокрученному списку панель не трогает;
 *   модальность — :modal у панели, ссылка на странице под ней
 *                 не получает фокус.
 */

describe('Drawer: разметка', () => {
    it('это модальный диалог с именем', () => {
        render(<Drawer open onClose={() => undefined} label="Фильтры">Содержимое</Drawer>);

        const panel = screen.getByRole('dialog', {name: 'Фильтры'});

        expect(panel).toBeInTheDocument();
        expect(panel).toHaveAttribute('open');
    });

    it('закрытая панель остаётся в разметке, но без open', () => {
        const {container} = render(
            <Drawer open={false} onClose={() => undefined} label="Фильтры">Содержимое</Drawer>,
        );

        expect(container.querySelector('dialog')).not.toBeNull();
        expect(container.querySelector('dialog')).not.toHaveAttribute('open');
    });

    it('край и вид уходят в атрибуты: по ним и рисует CSS', () => {
        const {container} = render(
            <Drawer open onClose={() => undefined} side="end" variant="PLAIN" label="Меню">Текст</Drawer>,
        );
        const panel = container.querySelector('dialog')!;

        expect(panel.dataset.side).toBe('end');
        expect(panel.dataset.variant).toBe('PLAIN');
    });

    it('у HANDLE есть ручка-кнопка, у PLAIN её нет', () => {
        const withHandle = render(<Drawer open onClose={() => undefined} label="А">Текст</Drawer>);
        expect(withHandle.container.querySelector('button')).not.toBeNull();
        withHandle.unmount();

        const plain = render(<Drawer open onClose={() => undefined} variant="PLAIN" label="Б">Текст</Drawer>);
        expect(plain.container.querySelector('button')).toBeNull();
    });

    it('размер ступени уходит переменной, а не числом в разметке', () => {
        const {container} = render(
            <Drawer open onClose={() => undefined} snap={['40vh', 'full']} label="А">Текст</Drawer>,
        );

        expect(container.querySelector('dialog')!.style.getPropertyValue('--drawer-size')).toBe('40vh');
    });

    it('«full» переводится в полный размер', () => {
        const {container} = render(
            <Drawer open onClose={() => undefined} snap={['full']} label="А">Текст</Drawer>,
        );

        expect(container.querySelector('dialog')!.style.getPropertyValue('--drawer-size')).toBe('100%');
    });
});

describe('Drawer: ступени', () => {
    it('нажатие на ручку переводит на следующую ступень по кругу', async () => {
        const user = userEvent.setup();
        const onSnapChange = vi.fn();
        const {container} = render(
            <Drawer open onClose={() => undefined} snap={['40vh', 'full']} onSnapChange={onSnapChange} label="А">
                Текст
            </Drawer>,
        );
        const panel = container.querySelector('dialog')!;

        await user.click(screen.getByRole('button'));

        expect(onSnapChange).toHaveBeenCalledWith(1, 'full');
        expect(panel.style.getPropertyValue('--drawer-size')).toBe('100%');

        await user.click(screen.getByRole('button'));

        expect(panel.style.getPropertyValue('--drawer-size')).toBe('40vh');
    });

    it('без ступеней нажатие на ручку закрывает', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(<Drawer open onClose={onClose} label="А">Текст</Drawer>);

        await user.click(screen.getByRole('button'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('стрелки с ручки двигают по ступеням', async () => {
        const user = userEvent.setup();
        const {container} = render(
            <Drawer open onClose={() => undefined} snap={['40vh', 'full']} label="А">Текст</Drawer>,
        );
        const panel = container.querySelector('dialog')!;

        screen.getByRole('button').focus();
        await user.keyboard('{ArrowUp}');

        expect(panel.style.getPropertyValue('--drawer-size')).toBe('100%');

        await user.keyboard('{ArrowDown}');

        expect(panel.style.getPropertyValue('--drawer-size')).toBe('40vh');
    });

    it('стрелка вниз с нижней ступени закрывает', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(<Drawer open onClose={onClose} snap={['40vh', 'full']} label="А">Текст</Drawer>);

        screen.getByRole('button').focus();
        await user.keyboard('{ArrowDown}');

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('у боковой панели стрелки горизонтальные', async () => {
        const user = userEvent.setup();
        const {container} = render(
            <Drawer open onClose={() => undefined} side="end" snap={['18rem', 'full']} label="А">Текст</Drawer>,
        );
        const panel = container.querySelector('dialog')!;

        screen.getByRole('button').focus();
        await user.keyboard('{ArrowLeft}');

        expect(panel.style.getPropertyValue('--drawer-size')).toBe('100%');
    });

    it('открывается с заданной ступени', () => {
        const {container} = render(
            <Drawer open onClose={() => undefined} snap={['40vh', 'full']} defaultSnap={1} label="А">Текст</Drawer>,
        );

        expect(container.querySelector('dialog')!.style.getPropertyValue('--drawer-size')).toBe('100%');
    });
});

describe('Drawer: закрытие', () => {
    /*
     * Esc и щелчок в затемнение здесь не проверить: в jsdom <dialog>
     * подменён заглушкой, которая умеет только show/close. Замерено
     * в Chromium 141 — и Esc, и щелчок мимо закрывают панель, фокус
     * при открытии оказывается внутри неё, затемнение непрозрачно.
     */

    it('следующее открытие начинается с начальной ступени', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const {container, rerender} = render(
            <Drawer open onClose={onClose} snap={['40vh', 'full']} label="А">Текст</Drawer>,
        );
        const panel = container.querySelector('dialog')!;

        await user.click(screen.getByRole('button'));
        expect(panel.style.getPropertyValue('--drawer-size')).toBe('100%');

        rerender(<Drawer open={false} onClose={onClose} snap={['40vh', 'full']} label="А">Текст</Drawer>);
        rerender(<Drawer open onClose={onClose} snap={['40vh', 'full']} label="А">Текст</Drawer>);

        expect(panel.style.getPropertyValue('--drawer-size')).toBe('40vh');
    });
});

describe('Drawer: арифметика жеста', () => {
    /* Чистые функции: единственное место, где у жеста есть числа. */

    it('в сторону закрытия панель едет, в обратную — нет', () => {
        expect(shift(120, false)).toBe(120);
        expect(shift(-120, false)).toBe(0);
    });

    it('обратный ход разрешён, когда есть ступень выше', () => {
        expect(shift(-120, true)).toBe(-120);
    });

    it('короткий и медленный жест возвращает панель на место', () => {
        expect(settle({distance: 20, speed: 0.05, size: 400, step: 1, steps: 2}))
            .toEqual({close: false, index: 1});
    });

    it('долгий жест вниз опускает на ступень ниже', () => {
        expect(settle({distance: 200, speed: 0.1, size: 400, step: 1, steps: 2}))
            .toEqual({close: false, index: 0});
    });

    it('с нижней ступени вниз — закрытие', () => {
        expect(settle({distance: 200, speed: 0.1, size: 400, step: 0, steps: 2}))
            .toEqual({close: true});
    });

    it('быстрый бросок закрывает и с короткого пути', () => {
        /* Так человек и ждёт от жеста: важно не расстояние, а скорость. */
        expect(settle({distance: 30, speed: 1.2, size: 400, step: 0, steps: 2}))
            .toEqual({close: true});
    });

    it('бросок вверх поднимает на ступень выше и не выше последней', () => {
        expect(settle({distance: -30, speed: -1.2, size: 400, step: 0, steps: 2}))
            .toEqual({close: false, index: 1});
        expect(settle({distance: -300, speed: -1.2, size: 400, step: 1, steps: 2}))
            .toEqual({close: false, index: 1});
    });
});

describe('Drawer: доступность', () => {
    it('проходит axe', async () => {
        const {container} = render(
            <Drawer open onClose={() => undefined} label="Фильтры">
                <p>Содержимое панели</p>
            </Drawer>,
        );

        expect((await axe.run(container, {rules: {'color-contrast': {enabled: false}}})).violations).toEqual([]);
    });

    it('у ручки есть имя: без него это была бы безымянная кнопка', () => {
        render(<Drawer open onClose={() => undefined} label="А">Текст</Drawer>);

        expect(screen.getByRole('button', {name: 'Размер панели'})).toBeInTheDocument();
    });

    it('подписи ручки меняются', () => {
        render(<Drawer open onClose={() => undefined} labels={{handle: 'Size'}} label="А">Текст</Drawer>);

        expect(screen.getByRole('button', {name: 'Size'})).toBeInTheDocument();
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Drawer open onClose={() => undefined} snap={['40vh', 'full']} label="А">Текст</Drawer>);

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});

describe('Drawer: ступень — это сдвиг, а не размер', () => {
    /*
     * Панель сразу ростом в самую большую ступень, а текущая выражается
     * отступом покоя. Иначе, как было видно на записи: содержимого в панели
     * только на одну ступень, при жесте она отрывается от края, а на
     * отпускании меняется block-size — и панель прыгает на новое место,
     * разом показывая остальной список.
     *
     * Сами числа — браузерный замер (см. Drawer.module.css); здесь
     * проверяется, какие переменные уходят в разметку.
     */
    const vars = (panel: HTMLElement) => ({
        size: panel.style.getPropertyValue('--drawer-size'),
        full: panel.style.getPropertyValue('--drawer-full'),
        rest: panel.style.getPropertyValue('--drawer-rest'),
        max: panel.style.getPropertyValue('--drawer-max'),
    });

    function panelOf(markup: React.ReactElement) {
        const {container} = render(markup);

        return container.querySelector('dialog')!;
    }

    it('ход панели — самая большая ступень, текущая уходит в отступ', () => {
        const panel = panelOf(
            <Drawer open onClose={() => undefined} snap={['40vh', 'full']} label="А">Текст</Drawer>,
        );

        expect(vars(panel)).toEqual({
            size: '40vh',
            full: '100%',
            rest: 'calc(100% - 40vh)',
            max: '100%',
        });
    });

    it('на самой большой ступени отступа нет', () => {
        const panel = panelOf(
            <Drawer open onClose={() => undefined} snap={['full']} defaultSnap={0} label="А">Текст</Drawer>,
        );

        expect(panel.style.getPropertyValue('--drawer-size')).toBe('100%');
        expect(panel.style.getPropertyValue('--drawer-rest')).toBe('');
    });

    /*
     * Ступень auto в арифметику не годится: calc(auto - auto) невычислим.
     * Там остаётся прежний порядок — панель ростом в ступень.
     */
    it('со ступенью auto ход не считается', () => {
        const panel = panelOf(
            <Drawer open onClose={() => undefined} snap={['auto', 'full']} label="А">Текст</Drawer>,
        );

        expect(vars(panel)).toEqual({size: 'auto', full: '', rest: '', max: ''});
    });

    it('одна ступень — прежний порядок, без хода и отступа', () => {
        const panel = panelOf(
            <Drawer open onClose={() => undefined} snap={['18rem']} side="end" label="А">Текст</Drawer>,
        );

        expect(vars(panel)).toEqual({size: '18rem', full: '', rest: '', max: ''});
    });

    /*
     * Предел 90dvh оставляет полоску, по которой видно страницу под панелью.
     * Для хода «во весь экран» он был потолком: замерено в Chromium 141,
     * окно 800px — панель вставала в 720px, сверху пустая полоса в 80px.
     */
    it('ход во весь экран снимает предел высоты', () => {
        const panel = panelOf(
            <Drawer open onClose={() => undefined} snap={['full']} label="А">Текст</Drawer>,
        );

        expect(panel.style.getPropertyValue('--drawer-max')).toBe('100%');
    });
    /*
     * На неполной ступени часть роста панели ниже края экрана, и прокрутка
     * списка увела бы содержимое в невидимое. Замерено в Chromium 141,
     * окно 800px, ступень 40vh: прокрутка тела до конца ставила последнюю
     * строку на 1240…1264, то есть за экраном. На полной ступени та же
     * строка приходит на 760…784 — видна.
     */
    it('на неполной ступени список заперт, на полной листается', async () => {
        const user = userEvent.setup();
        const panel = panelOf(
            <Drawer open onClose={() => undefined} snap={['40vh', 'full']} label="А">Текст</Drawer>,
        );

        expect(panel).toHaveAttribute('data-partial');

        await user.click(screen.getByRole('button', {name: 'Размер панели'}));

        expect(panel).not.toHaveAttribute('data-partial');
    });

    it('со ступенью auto запирать нечего: панель ростом в ступень', () => {
        const panel = panelOf(
            <Drawer open onClose={() => undefined} snap={['auto', 'full']} label="А">Текст</Drawer>,
        );

        expect(panel).not.toHaveAttribute('data-partial');
    });
});
