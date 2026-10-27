import {render, screen} from '@testing-library/react';
import axe from 'axe-core';
import {Profiler} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Progress} from './Progress';

/*
 * Разметка, имя и значение. Чего здесь нет: рисунка. Заливка — это фон
 * с градиентом, маска и @property, то есть движок, которого в jsdom нет.
 *
 * Замерено в Chromium 141: роль progressbar, valuemin 0, valuemax из max;
 * у <progress> без value значения в дереве доступности нет, и он совпадает
 * с :indeterminate; доля идёт к новому значению кадрами 0.4 → 0.53 → 0.68
 * → 0.80 → 0.88 → 0.9; с appearance: none платформа неопределённое
 * состояние не анимирует вовсе.
 */

function bar() {
    return screen.getByRole('progressbar');
}

describe('Progress: значение и шкала', () => {
    it('роль и значение приходят от <progress>, а не из атрибутов', () => {
        render(<Progress label="Загрузка" value={0.4}/>);

        expect(bar().tagName).toBe('PROGRESS');
        expect(bar()).toHaveValue(0.4);
        /* Своих aria-value* нет: их незачем дублировать за платформой. */
        expect(bar()).not.toHaveAttribute('aria-valuenow');
        expect(bar()).not.toHaveAttribute('aria-valuemax');
        expect(bar()).not.toHaveAttribute('role');
    });

    it('шкала задаётся max, по умолчанию единица', () => {
        const {rerender} = render(<Progress label="Загрузка" value={0.4}/>);
        expect(bar()).toHaveAttribute('max', '1');

        rerender(<Progress label="Загрузка" value={40} max={100}/>);
        expect(bar()).toHaveAttribute('max', '100');
        expect(bar()).toHaveValue(40);
    });

    it('без value атрибут не ставится вовсе: это и есть неизвестный ход дела', () => {
        render(<Progress label="Обработка"/>);

        expect(bar()).not.toHaveAttribute('value');
    });

    /*
     * Доля уезжает в --progress-to, а не в --progress: инлайновый стиль
     * сильнее объявлений автора, и с долей прямо в --progress переставал
     * работать @starting-style, то есть заполнение от нуля при появлении
     * (замерено: восемь кадров подряд 0.4 вместо 0 → 0.18 → 0.27 → 0.4).
     */
    it('доля для заливки считается от шкалы', () => {
        render(<Progress label="Загрузка" value={40} max={100}/>);

        expect(bar().style.getPropertyValue('--progress-to')).toBe('0.4');
    });

    it('значение за шкалой обрезается: кольцо не крутит больше оборота', () => {
        const {rerender} = render(<Progress label="Загрузка" value={5} max={1}/>);
        expect(bar().style.getPropertyValue('--progress-to')).toBe('1');

        rerender(<Progress label="Загрузка" value={-3} max={1}/>);
        expect(bar().style.getPropertyValue('--progress-to')).toBe('0');
    });

    it('у неизвестного хода дела доли нет', () => {
        render(<Progress label="Обработка"/>);

        expect(bar().style.getPropertyValue('--progress-to')).toBe('');
    });
});

describe('Progress: вид', () => {
    it('по умолчанию полоса', () => {
        const {container} = render(<Progress label="Загрузка" value={0.4}/>);

        expect((container.firstElementChild as HTMLElement).className).toMatch(/line/);
    });

    it('кольцо выбирается пропом', () => {
        const {container} = render(<Progress variant="CIRCLE" label="Загрузка" value={0.4}/>);

        expect((container.firstElementChild as HTMLElement).className).toMatch(/circle/);
    });

    it('свой класс не вытесняет собственный', () => {
        const {container} = render(<Progress className="мой" label="Загрузка" value={0.4}/>);
        const node = container.firstElementChild as HTMLElement;

        expect(node.className).toContain('мой');
        expect(node.className.split(' ').length).toBeGreaterThan(2);
    });

    it('чужие пропсы доезжают до <progress>', () => {
        render(<Progress label="Загрузка" value={0.4} data-test="да"/>);

        expect(bar()).toHaveAttribute('data-test', 'да');
    });
});

describe('Progress: имя и число', () => {
    it('подпись становится именем индикатора', () => {
        render(<Progress label="Загрузка файла" value={0.4}/>);

        expect(screen.getByRole('progressbar', {name: 'Загрузка файла'})).toBe(bar());
    });

    it('скрытая подпись остаётся в дереве доступности: по ней считается имя', () => {
        render(<Progress label="Загрузка файла" value={0.4}/>);
        const label = screen.getByText('Загрузка файла');

        expect(label).toHaveAttribute('data-hidden');
        /* Именно data-, а не aria-hidden: на неё ссылается aria-labelledby. */
        expect(label).not.toHaveAttribute('aria-hidden');
    });

    it('showLabel показывает ту же подпись глазами', () => {
        render(<Progress label="Загрузка файла" showLabel value={0.4}/>);

        expect(screen.getByText('Загрузка файла')).not.toHaveAttribute('data-hidden');
        expect(screen.getByRole('progressbar', {name: 'Загрузка файла'})).toBeInTheDocument();
    });

    it('чужое aria-labelledby сильнее подписи, которой нет', () => {
        render(
            <>
                <span id="снаружи">Отправка формы</span>
                <Progress aria-labelledby="снаружи" value={0.4}/>
            </>,
        );

        expect(screen.getByRole('progressbar', {name: 'Отправка формы'})).toBeInTheDocument();
    });

    it('число рисуется format и спрятано от скринридера', () => {
        render(<Progress label="Загрузка" value={40} max={100} format={value => `${value}%`}/>);
        const value = screen.getByText('40%');

        expect(value).toHaveAttribute('aria-hidden', 'true');
        /* Значение уже объявлено индикатором — вслух оно не повторяется. */
        expect(screen.getByRole('progressbar', {name: 'Загрузка'})).toBeInTheDocument();
    });

    it('format получает значение и шкалу', () => {
        const format = vi.fn(() => 'готово');
        render(<Progress label="Загрузка" value={3} max={7} format={format}/>);

        expect(format).toHaveBeenCalledWith(3, 7);
    });

    it('у неизвестного хода дела числа нет: показывать нечего', () => {
        const format = vi.fn(() => 'нет');
        render(<Progress label="Обработка" format={format}/>);

        expect(format).not.toHaveBeenCalled();
    });

    it('индикатор без имени ругается в разработке', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        render(<Progress value={0.4}/>);

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('без имени'));
        warn.mockRestore();
    });

    it('с именем не ругается', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        render(<Progress label="Загрузка" value={0.4}/>);

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('Progress: доступность и перерисовки', () => {
    it('проходит axe', async () => {
        const {container} = render(
            <Progress label="Загрузка файла" showLabel value={40} max={100} format={value => `${value}%`}/>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('кольцо и неизвестный ход дела тоже проходят axe', async () => {
        const {container} = render(
            <>
                <Progress variant="CIRCLE" label="Анкета" value={0.65}/>
                <Progress variant="CIRCLE" label="Обработка"/>
            </>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('смена значения перерисовывает только сам индикатор', () => {
        const onRender = vi.fn();
        const {rerender} = render(
            <Profiler id="progress" onRender={onRender}>
                <Progress label="Загрузка" value={0.1}/>
            </Profiler>,
        );
        const initial = onRender.mock.calls.length;

        rerender(
            <Profiler id="progress" onRender={onRender}>
                <Progress label="Загрузка" value={0.9}/>
            </Profiler>,
        );

        /* Ровно одна перерисовка на смену значения: доезжает заливка уже
           средствами CSS, кадры анимации React не касаются. */
        expect(onRender.mock.calls.length - initial).toBe(1);
        expect(bar().style.getPropertyValue('--progress-to')).toBe('0.9');
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Progress variant="CIRCLE" label="Загрузка" value={0.4} max={1}/>);

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
