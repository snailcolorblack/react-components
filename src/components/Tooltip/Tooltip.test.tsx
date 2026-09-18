import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Button} from '../Button/Button';
import {Tooltip} from './Tooltip';

/*
 * Здесь проверяется логика: связь по aria, показ и скрытие по наведению
 * и фокусу, задержки, сохранение чужих обработчиков.
 *
 * Геометрии нет — привязка к якорю и переворот у края экрана считаются
 * движком, которого в jsdom не существует. Их место в браузерных замерах.
 */

const open = () => screen.getByRole('tooltip', {hidden: true}).matches(':popover-open');

beforeEach(() => vi.useFakeTimers({shouldAdvanceTime: true}));
afterEach(() => vi.useRealTimers());

/*
 * pointerEventsCheck: 0 — подсказка прозрачна для курсора, пока закрыта,
 * и возвращает pointer-events только по :popover-open. Этот селектор jsdom
 * вычислять не умеет, вычисленный стиль остаётся none, и userEvent
 * отказывается наводить на неё. Саму наводимость меряем в браузере.
 */
function setup() {
    return userEvent.setup({advanceTimers: vi.advanceTimersByTime, pointerEventsCheck: 0});
}

/*
 * Там, где проверяются задержки, вместо userEvent используется fireEvent:
 * userEvent между шагами ждёт сам, и на фейковых таймерах его паузы
 * прокручивают наши — задержка показа «срабатывает» раньше срока.
 * fireEvent шлёт ровно одно событие и времени не тратит.
 */
function enter(element: Element) {
    fireEvent.pointerEnter(element, {pointerType: 'mouse'});
}

function leave(element: Element) {
    fireEvent.pointerLeave(element, {pointerType: 'mouse'});
}

function Basic({...rest}: Partial<Parameters<typeof Tooltip>[0]> = {}) {
    return (
        <Tooltip text="Сохранит черновик" {...rest}>
            <Button>Сохранить</Button>
        </Tooltip>
    );
}

describe('Tooltip', () => {
    it('рендерит подсказку с ролью tooltip и popover="hint"', () => {
        render(<Basic/>);
        const tip = screen.getByRole('tooltip', {hidden: true});
        expect(tip).toHaveAttribute('popover', 'hint');
        expect(tip).toHaveTextContent('Сохранит черновик');
    });

    it('связывает триггер с подсказкой через aria-describedby', () => {
        render(<Basic/>);
        const trigger = screen.getByRole('button', {name: 'Сохранить'});
        const tip = screen.getByRole('tooltip', {hidden: true});
        expect(trigger).toHaveAttribute('aria-describedby', tip.id);
    });

    it('mode="label" связывает через aria-labelledby и даёт кнопке имя', () => {
        render(
            <Tooltip text="Удалить" mode="label">
                <Button><span aria-hidden="true">×</span></Button>
            </Tooltip>,
        );
        const trigger = screen.getByRole('button');
        expect(trigger).toHaveAttribute('aria-labelledby');
        expect(trigger).not.toHaveAttribute('aria-describedby');
        // подсказка стала именем кнопки
        expect(trigger.getAttribute('aria-labelledby')).toBe(screen.getByRole('tooltip', {hidden: true}).id);
    });

    it('закрыта по умолчанию', () => {
        render(<Basic/>);
        expect(open()).toBe(false);
    });

    /* ---------------------------------------------------------------- */
    /*  Наведение                                                       */
    /* ---------------------------------------------------------------- */

    it('наведение показывает подсказку только после задержки', () => {
        render(<Basic delay={400}/>);

        enter(screen.getByRole('button'));
        vi.advanceTimersByTime(399);
        expect(open()).toBe(false);

        vi.advanceTimersByTime(1);
        expect(open()).toBe(true);
    });

    it('курсор ушёл раньше срока — подсказка не появляется вовсе', () => {
        render(<Basic delay={400}/>);

        enter(screen.getByRole('button'));
        vi.advanceTimersByTime(200);
        leave(screen.getByRole('button'));
        vi.advanceTimersByTime(1000);

        expect(open()).toBe(false);
    });

    it('уход курсора скрывает не сразу — успеть перевести его на подсказку', () => {
        render(<Basic delay={0}/>);

        enter(screen.getByRole('button'));
        vi.advanceTimersByTime(10);
        expect(open()).toBe(true);

        leave(screen.getByRole('button'));
        vi.advanceTimersByTime(100);
        // ещё не скрылась: WCAG 1.4.13 требует возможности навести на неё
        expect(open()).toBe(true);

        vi.advanceTimersByTime(100);
        expect(open()).toBe(false);
    });

    it('наведение на саму подсказку отменяет скрытие', () => {
        render(<Basic delay={0}/>);

        enter(screen.getByRole('button'));
        vi.advanceTimersByTime(10);
        leave(screen.getByRole('button'));
        enter(screen.getByRole('tooltip', {hidden: true}));
        vi.advanceTimersByTime(1000);

        expect(open()).toBe(true);
    });

    it('касание подсказку не показывает', () => {
        render(<Basic delay={0}/>);

        fireEvent.pointerEnter(screen.getByRole('button'), {pointerType: 'touch'});
        vi.advanceTimersByTime(1000);

        expect(open()).toBe(false);
    });

    /* ---------------------------------------------------------------- */
    /*  Клавиатура                                                      */
    /*                                                                  */
    /*  Показ по фокусу ограничен :focus-visible — щелчок мышью подсказку */
    /*  не вызывает. Проверить это в jsdom нельзя: там :focus-visible    */
    /*  вычисляется эвристикой по последнему событию, и она протекает    */
    /*  между тестами — pointer-событие из соседнего теста оставляет     */
    /*  модальность «указательной». Показ по клавиатуре меряется         */
    /*  в браузере; здесь проверяется только скрытие по уходу фокуса,    */
    /*  которое от :focus-visible не зависит.                            */
    /* ---------------------------------------------------------------- */

    it('уход фокуса скрывает подсказку', () => {
        render(<Basic delay={0}/>);
        const trigger = screen.getByRole('button');

        enter(trigger);
        vi.advanceTimersByTime(10);
        expect(open()).toBe(true);

        fireEvent.blur(trigger);
        expect(open()).toBe(false);
    });

    /* ---------------------------------------------------------------- */
    /*  Триггер остаётся собой                                          */
    /* ---------------------------------------------------------------- */

    it('не съедает собственные обработчики триггера', async () => {
        const user = setup();
        const onPointerEnter = vi.fn();
        const onFocus = vi.fn();
        const onClick = vi.fn();

        render(
            <Tooltip text="Подсказка">
                <Button onPointerEnter={onPointerEnter} onFocus={onFocus} onClick={onClick}>Кнопка</Button>
            </Tooltip>,
        );

        await user.hover(screen.getByRole('button'));
        expect(onPointerEnter).toHaveBeenCalledTimes(1);
        await user.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(onFocus).toHaveBeenCalled();
    });

    it('не затирает собственный style триггера', () => {
        render(
            <Tooltip text="Подсказка">
                <Button style={{opacity: 0.5}}>Кнопка</Button>
            </Tooltip>,
        );
        const trigger = screen.getByRole('button');
        expect(trigger.style.opacity).toBe('0.5');
        // имя якоря добавлено рядом, а не вместо
        expect(trigger.style.getPropertyValue('anchor-name')).not.toBe('');
    });

    it('имя якоря у триггера и подсказки совпадает', () => {
        render(<Basic/>);
        const trigger = screen.getByRole('button');
        const tip = screen.getByRole('tooltip', {hidden: true});
        expect(trigger.style.getPropertyValue('anchor-name'))
            .toBe(tip.style.getPropertyValue('--tooltip-anchor'));
    });

    it('две подсказки на странице не путают якоря', () => {
        render(
            <>
                <Tooltip text="Первая"><Button>Раз</Button></Tooltip>
                <Tooltip text="Вторая"><Button>Два</Button></Tooltip>
            </>,
        );
        const [a, b] = screen.getAllByRole('button');
        expect(a.style.getPropertyValue('anchor-name'))
            .not.toBe(b.style.getPropertyValue('anchor-name'));
    });

    /* ---------------------------------------------------------------- */
    /*  Раскладка                                                       */
    /* ---------------------------------------------------------------- */

    it.each([
        ['block-start', 'block-start span-inline-end', 'bottom center'],
        ['block-end', 'block-end span-inline-end', 'top center'],
        ['inline-start', 'inline-start span-block-end', 'center right'],
        ['inline-end', 'inline-end span-block-end', 'center left'],
    ] as const)('placement="%s" задаёт область и точку роста', (placement, area, origin) => {
        render(<Basic placement={placement}/>);
        const tip = screen.getByRole('tooltip', {hidden: true});
        expect(tip.style.getPropertyValue('--tooltip-area')).toBe(area);
        expect(tip.style.getPropertyValue('--tooltip-origin')).toBe(origin);
    });

    /* ---------------------------------------------------------------- */
    /*  Утечки и доступность                                            */
    /* ---------------------------------------------------------------- */

    it('отложенный показ не срабатывает после размонтирования', () => {
        /*
         * Страховка на будущее, а не проверка очистки таймеров: React сам
         * обнуляет ref при размонтировании, и отложенный показ упирается
         * в ?. — очистку можно убрать, и тест всё равно пройдёт. Он ловит
         * другое: если однажды компонент начнёт держать сам узел вместо
         * ref, показ после размонтирования станет настоящим.
         */
        const show = vi.spyOn(HTMLElement.prototype, 'showPopover');
        const {unmount} = render(<Basic delay={400}/>);

        enter(screen.getByRole('button'));
        vi.advanceTimersByTime(200);
        unmount();
        vi.advanceTimersByTime(2000);

        expect(show).not.toHaveBeenCalled();
        show.mockRestore();
    });

    it('открытая подсказка проходит axe', async () => {
        const user = setup();
        const {container} = render(<Basic delay={0}/>);

        await user.hover(screen.getByRole('button'));
        vi.advanceTimersByTime(10);
        expect(open()).toBe(true);

        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Basic placement="inline-end" mode="label"/>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
