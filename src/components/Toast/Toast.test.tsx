import {act, fireEvent, render, screen} from '@testing-library/react';
import axe from 'axe-core';
import {createRef} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {Toast} from './Toast';
import type {ToastHandle} from './Toast.interface.ts';

/*
 * Очередь, роли, таймеры и пауза. Геометрии нет: верхний слой, углы экрана
 * и переходы @starting-style считаются движком, которого в jsdom не
 * существует, — их место в браузерных замерах.
 */

afterEach(() => {
    /* Области живут в body и переживают unmount: между тестами убираем. */
    document.querySelectorAll('[aria-label="Уведомления"]').forEach(node => node.remove());
});

/** Смонтировать область и вернуть её ручку. */
function mount(props: Partial<Parameters<typeof Toast>[0]> = {}) {
    const ref = createRef<ToastHandle>();

    render(<Toast ref={ref} {...props}/>);

    return ref as {current: ToastHandle};
}

function plates() {
    return [...document.querySelectorAll('[data-state]')];
}

function region() {
    return document.querySelector('[aria-label="Уведомления"]') as HTMLElement;
}

describe('Toast: очередь', () => {
    it('до первого show на странице пусто', () => {
        mount();
        expect(plates()).toHaveLength(0);
    });

    it('show рисует сообщение в области', () => {
        const toast = mount();

        act(() => void toast.current.show('Сохранено'));

        expect(screen.getByText('Сохранено')).toBeInTheDocument();
        expect(region()).toHaveAttribute('aria-live', 'polite');
        expect(region()).toHaveAttribute('popover', 'manual');
    });

    it('четыре вызова — четыре сообщения, а не одно', () => {
        const toast = mount();

        act(() => {
            ['Первая', 'Вторая', 'Третья', 'Четвёртая'].forEach(text =>
                toast.current.show(`${text} ошибка`, {variant: 'ERROR'}));
        });

        expect(plates()).toHaveLength(4);
        /*
         * «Ошибка.» в начале — слово варианта из Alert: оно скрыто от глаз
         * и существует ради озвучки, потому что одним цветом вариант
         * показывать нельзя. В текст плашки оно попадает, в вид — нет.
         */
        expect(plates().map(plate => plate.textContent?.replace('×', '').replace('Ошибка. ', '')))
            .toEqual(['Первая ошибка', 'Вторая ошибка', 'Третья ошибка', 'Четвёртая ошибка']);
    });

    it('одинаковый текст не схлопывается: два вызова — две плашки', () => {
        const toast = mount();

        act(() => {
            toast.current.show('Сохранено');
            toast.current.show('Сохранено');
        });

        expect(screen.getAllByText('Сохранено')).toHaveLength(2);
    });

    it('снаружи сообщение только показывают: в ручке один show', () => {
        const toast = mount();

        expect(Object.keys(toast.current)).toEqual(['show']);
    });

    it('крестик закрывает своё сообщение и не трогает соседние', () => {
        vi.useFakeTimers();
        const toast = mount({duration: 0});

        act(() => {
            toast.current.show('Первое');
            toast.current.show('Второе');
            toast.current.show('Третье');
        });

        fireEvent.click(screen.getAllByRole('button', {name: 'Закрыть'})[1]);
        act(() => vi.advanceTimersByTime(200));

        expect(plates().map(plate => plate.textContent?.replace('×', ''))).toEqual(['Первое', 'Третье']);
        vi.useRealTimers();
    });

    it('сообщения одной области лежат в одном столбике', () => {
        const toast = mount({position: 'TOP_END'});

        act(() => {
            toast.current.show('Первое');
            toast.current.show('Второе');
        });

        expect(region()).toHaveAttribute('data-position', 'TOP_END');
        expect(region().children).toHaveLength(2);
        expect(document.querySelectorAll('[aria-label="Уведомления"]')).toHaveLength(1);
    });

    it('две области — два угла', () => {
        const top = mount({position: 'TOP_START'});
        const bottom = mount({position: 'BOTTOM_END'});

        act(() => {
            top.current.show('Сверху');
            bottom.current.show('Снизу');
        });

        expect(screen.getByText('Сверху').closest('[aria-label="Уведомления"]'))
            .not.toBe(screen.getByText('Снизу').closest('[aria-label="Уведомления"]'));
    });
});

describe('Toast: плашка', () => {
    it('вариант уходит на плашку', () => {
        const toast = mount();

        act(() => void toast.current.show('Не удалось', {variant: 'ERROR'}));

        expect(screen.getByText('Не удалось').closest('[data-variant]'))
            .toHaveAttribute('data-variant', 'ERROR');
    });

    it('иконка рисуется и скрыта от скринридера', () => {
        const toast = mount();

        act(() => void toast.current.show('Сохранено', {icon: <svg data-testid="icon"/>}));

        expect(screen.getByTestId('icon').closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('плашка сама по себе не живой регион: объявляет область', () => {
        const toast = mount();

        act(() => void toast.current.show('Не удалось', {variant: 'ERROR'}));
        const plate = screen.getByText('Не удалось').closest('[data-variant]') as HTMLElement;

        expect(plate).not.toHaveAttribute('role');
        expect(plate).not.toHaveAttribute('aria-live');
    });

    it('крестик убирает сообщение', () => {
        vi.useFakeTimers();
        const toast = mount({duration: 0});

        act(() => void toast.current.show('Сохранено'));
        fireEvent.click(screen.getByRole('button', {name: 'Закрыть'}));
        act(() => vi.advanceTimersByTime(200));

        expect(plates()).toHaveLength(0);
        vi.useRealTimers();
    });

    it('подпись крестика меняется', () => {
        const toast = mount({closeLabel: 'Скрыть', duration: 0});

        act(() => void toast.current.show('Сохранено'));
        expect(screen.getByRole('button', {name: 'Скрыть'})).toBeInTheDocument();
    });

    it('проходит axe', async () => {
        const toast = mount();

        act(() => {
            toast.current.show('Сохранено', {variant: 'SUCCESS', icon: <svg/>});
            toast.current.show('Не удалось', {variant: 'ERROR'});
        });

        const results = await axe.run(document.body, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const toast = mount();

        act(() => void toast.current.show('Сохранено', {variant: 'SUCCESS'}));
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});

describe('Toast: таймер', () => {
    it('сообщение закрывается само через duration области', () => {
        vi.useFakeTimers();
        const toast = mount({duration: 5000});

        act(() => void toast.current.show('Сохранено'));

        act(() => vi.advanceTimersByTime(4999));
        expect(plates()).toHaveLength(1);

        act(() => vi.advanceTimersByTime(1 + 200));
        expect(plates()).toHaveLength(0);
        vi.useRealTimers();
    });

    it('у сообщения может быть свой duration', () => {
        vi.useFakeTimers();
        const toast = mount({duration: 5000});

        act(() => {
            toast.current.show('Быстрое', {duration: 1000});
            toast.current.show('Обычное');
        });

        act(() => vi.advanceTimersByTime(1200));
        expect(plates().map(plate => plate.textContent?.replace('×', ''))).toEqual(['Обычное']);
        vi.useRealTimers();
    });

    it('duration 0 не закрывает', () => {
        vi.useFakeTimers();
        const toast = mount({duration: 0});

        act(() => void toast.current.show('Висит'));
        act(() => vi.advanceTimersByTime(60000));

        expect(plates()).toHaveLength(1);
        vi.useRealTimers();
    });

    it('каждое сообщение живёт своим таймером', () => {
        vi.useFakeTimers();
        const toast = mount({duration: 5000});

        act(() => void toast.current.show('Первое'));
        act(() => vi.advanceTimersByTime(3000));
        act(() => void toast.current.show('Второе'));

        act(() => vi.advanceTimersByTime(2200));
        expect(plates().map(plate => plate.textContent?.replace('×', ''))).toEqual(['Второе']);

        act(() => vi.advanceTimersByTime(3000));
        expect(plates()).toHaveLength(0);
        vi.useRealTimers();
    });

    it('курсор останавливает отсчёт и не сбрасывает его', () => {
        vi.useFakeTimers();
        const toast = mount({duration: 5000});

        act(() => void toast.current.show('Сохранено'));
        const plate = plates()[0];

        act(() => vi.advanceTimersByTime(4000));
        fireEvent.pointerEnter(plate);

        /* Под курсором время стоит. */
        act(() => vi.advanceTimersByTime(60000));
        expect(plates()).toHaveLength(1);

        fireEvent.pointerLeave(plate);
        /* Остаток — секунда, а не полные пять: отсчёт не начался заново. */
        act(() => vi.advanceTimersByTime(999));
        expect(plates()).toHaveLength(1);

        act(() => vi.advanceTimersByTime(1 + 200));
        expect(plates()).toHaveLength(0);
        vi.useRealTimers();
    });

    it('фокус внутри тоже останавливает отсчёт', () => {
        vi.useFakeTimers();
        const toast = mount({duration: 5000});

        act(() => void toast.current.show('Сохранено'));
        fireEvent.focusIn(screen.getByRole('button', {name: 'Закрыть'}));

        act(() => vi.advanceTimersByTime(60000));
        expect(plates()).toHaveLength(1);
        vi.useRealTimers();
    });

    it('пауза одного сообщения не держит остальные', () => {
        vi.useFakeTimers();
        const toast = mount({duration: 5000});

        act(() => {
            toast.current.show('Под курсором');
            toast.current.show('Само по себе');
        });

        fireEvent.pointerEnter(plates()[0]);
        act(() => vi.advanceTimersByTime(6000));

        expect(plates().map(plate => plate.textContent?.replace('×', ''))).toEqual(['Под курсором']);
        vi.useRealTimers();
    });
});

describe('Toast: имя области', () => {
    it('по умолчанию область названа «Уведомления»', () => {
        const toast = mount();

        act(() => void toast.current.show('Сохранено'));
        expect(document.querySelector('[role="region"]')).toHaveAttribute('aria-label', 'Уведомления');
    });

    it('имя меняется пропом: двух ориентиров с одним именем быть не должно', () => {
        const first = mount({position: 'TOP_END'});
        const second = mount({position: 'BOTTOM_START', label: 'Фоновые задачи'});

        act(() => {
            first.current.show('Первое');
            second.current.show('Второе');
        });

        const names = [...document.querySelectorAll('[role="region"]')]
            .map(node => node.getAttribute('aria-label'));

        expect(names).toEqual(['Уведомления', 'Фоновые задачи']);
    });
});
