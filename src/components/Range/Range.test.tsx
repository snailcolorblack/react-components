import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Range} from './Range';

/*
 * Разметка, роли, границы, притяжка и форма. Чего здесь нет: геометрии.
 * Место шарика, попадание курсора в нужное из двух полей и совпадение
 * шарика с точкой захвата считает движок, которого в jsdom не существует,
 * — это браузерные замеры (Chromium 141: расхождение шарика с курсором
 * не больше пикселя, разрез clip-path отдаёт курсор нужному полю,
 * цель нажатия 121×24 при норме 24×24, контраст заливки к фону 8.97:1).
 */

/** Поля ползунка в порядке разметки: у пары их два. */
function inputs() {
    return screen.getAllByRole('slider');
}

describe('Range: одиночный', () => {
    it('внутри настоящее поле, а не самодельный ползунок', () => {
        render(<Range label="Громкость" min={10} max={120} step={10} defaultValue={50}/>);
        const slider = screen.getByRole('slider', {name: 'Громкость'});

        expect(slider.tagName).toBe('INPUT');
        expect(slider).toHaveAttribute('type', 'range');
    });

    it('границы и шаг уходят в разметку: их считает браузер', () => {
        render(<Range label="Громкость" min={10} max={120} step={10} defaultValue={50}/>);
        const slider = screen.getByRole('slider');

        expect(slider).toHaveAttribute('min', '10');
        expect(slider).toHaveAttribute('max', '120');
        expect(slider).toHaveAttribute('step', '10');
        expect(slider).toHaveValue('50');
    });

    it('без defaultValue встаёт на начало шкалы', () => {
        render(<Range label="Громкость" min={10} max={120}/>);
        expect(screen.getByRole('slider')).toHaveValue('10');
    });

    it('сообщает новое значение числом, а не массивом', () => {
        const onChange = vi.fn();
        render(<Range label="Громкость" min={0} max={100} defaultValue={0} onChange={onChange}/>);

        fireEvent.change(screen.getByRole('slider'), {target: {value: '40'}});

        expect(onChange).toHaveBeenCalledWith(40);
    });

    it('управляемый снаружи не меняется сам', () => {
        const onChange = vi.fn();
        render(<Range label="Громкость" min={0} max={100} value={30} onChange={onChange}/>);

        fireEvent.change(screen.getByRole('slider'), {target: {value: '90'}});

        expect(onChange).toHaveBeenCalledWith(90);
        expect(screen.getByRole('slider')).toHaveValue('30');
    });

    it('выключенный выпадает из табуляции и из формы', () => {
        render(
            <form>
                <Range label="Громкость" name="volume" min={0} max={100} defaultValue={40} disabled/>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;

        expect(screen.getByRole('slider')).toBeDisabled();
        expect(new FormData(form).getAll('volume')).toEqual([]);
    });

    it('значение уходит в форму по name', () => {
        render(
            <form>
                <Range label="Громкость" name="volume" min={0} max={100} defaultValue={40}/>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;

        expect(new FormData(form).getAll('volume')).toEqual(['40']);
    });

    it('своя ошибка объявляется и связывается с полем', () => {
        render(<Range label="Громкость" min={0} max={100} defaultValue={40} error="Слишком тихо"/>);
        const slider = screen.getByRole('slider');
        const message = screen.getByText('Слишком тихо');

        expect(slider).toHaveAttribute('aria-describedby', message.id);
        expect(message).toHaveAttribute('aria-live', 'polite');
    });

    it('проходит axe', async () => {
        const {container} = render(<Range label="Громкость" min={0} max={100} defaultValue={40}/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });
});

describe('Range: точки на шкале', () => {
    it('точки рисуются подписями под шкалой', () => {
        render(<Range label="Срок" min={0} max={10} marks={[2, 4, 8]}/>);

        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('точки вне шкалы отбрасываются, порядок не важен', () => {
        render(<Range label="Срок" min={0} max={10} marks={[8, 2, 42, -5]}/>);

        expect(screen.queryByText('42')).toBeNull();
        expect(screen.queryByText('-5')).toBeNull();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('сами по себе точки ничего не ограничивают', () => {
        const onChange = vi.fn();
        render(<Range label="Срок" min={0} max={10} marks={[2, 4, 8]} defaultValue={0} onChange={onChange}/>);

        fireEvent.change(screen.getByRole('slider'), {target: {value: '7'}});

        expect(onChange).toHaveBeenCalledWith(7);
    });

    it('своя подпись точки читается вместо числа', () => {
        render(
            <Range
                label="Класс" min={0} max={10} defaultValue={5}
                marks={[{value: 5, label: 'средне'}]}
            />,
        );

        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'средне');
    });

    it('format меняет подписи и озвучку, но не значение', () => {
        render(
            <Range label="Цена" min={0} max={100} defaultValue={50} marks={[50]} format={value => `${value} ₽`}/>,
        );

        expect(screen.getByText('50 ₽')).toBeInTheDocument();
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '50 ₽');
        expect(screen.getByRole('slider')).toHaveValue('50');
    });

    it('подписи шкалы скрыты от скринридера: он уже знает границы и значение', () => {
        const {container} = render(<Range label="Срок" min={0} max={10} marks={[2]}/>);
        const marks = container.querySelector('[aria-hidden="true"] [class*="mark"]');

        expect(marks?.closest('[aria-hidden="true"]')).not.toBeNull();
    });
});

describe('Range: притяжка к точкам', () => {
    function Snapped({onChange}: {onChange?: (value: number) => void} = {}) {
        const [value, setValue] = useState(0);

        return (
            <Range
                label="Срок" min={0} max={10} marks={[2, 4, 8]} snap
                value={value}
                onChange={next => { setValue(next); onChange?.(next); }}
            />
        );
    }

    it('шаг отдаётся браузеру как «любой»: округляем мы', () => {
        render(<Range label="Срок" min={0} max={10} marks={[2, 4, 8]} snap/>);

        expect(screen.getByRole('slider')).toHaveAttribute('step', 'any');
    });

    it('значение притягивается к ближайшей точке', () => {
        const onChange = vi.fn();
        render(<Snapped onChange={onChange}/>);

        fireEvent.change(screen.getByRole('slider'), {target: {value: '5.5'}});

        // ближе к 4, чем к 8
        expect(onChange).toHaveBeenCalledWith(4);
    });

    it('края шкалы остаются достижимыми, даже если их нет в точках', () => {
        const onChange = vi.fn();
        render(<Snapped onChange={onChange}/>);

        fireEvent.change(screen.getByRole('slider'), {target: {value: '9.7'}});

        expect(onChange).toHaveBeenCalledWith(10);
    });

    it('стрелка шагает к соседней точке, а не на единицу', async () => {
        render(<Snapped/>);
        const slider = screen.getByRole('slider');
        slider.focus();

        await userEvent.keyboard('{ArrowRight}');
        expect(slider).toHaveValue('2');

        await userEvent.keyboard('{ArrowRight}');
        expect(slider).toHaveValue('4');

        await userEvent.keyboard('{ArrowLeft}');
        expect(slider).toHaveValue('2');
    });

    it('Home и End уводят к краям шкалы', async () => {
        render(<Snapped/>);
        const slider = screen.getByRole('slider');
        slider.focus();

        await userEvent.keyboard('{End}');
        expect(slider).toHaveValue('10');

        await userEvent.keyboard('{Home}');
        expect(slider).toHaveValue('0');
    });

    it('без притяжки клавиатура остаётся браузеру', async () => {
        const onChange = vi.fn();
        render(<Range label="Срок" min={0} max={10} marks={[2, 4, 8]} defaultValue={0} onChange={onChange}/>);
        const slider = screen.getByRole('slider');
        slider.focus();

        await userEvent.keyboard('{ArrowRight}');

        // jsdom стрелки сам не обрабатывает — важно, что их не перехватили мы
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('Range: пара значений', () => {
    function Pair({onChange}: {onChange?: (value: [number, number]) => void} = {}) {
        const [value, setValue] = useState<[number, number]>([20, 70]);

        return (
            <Range
                label="Цена" min={0} max={100} name="price"
                value={value}
                onChange={next => { setValue(next); onChange?.(next); }}
            />
        );
    }

    it('массив значений даёт два поля, число — одно', () => {
        const {rerender} = render(<Range label="Цена" min={0} max={100} value={[20, 70]}/>);
        expect(inputs()).toHaveLength(2);

        rerender(<Range label="Цена" min={0} max={100} value={40}/>);
        expect(inputs()).toHaveLength(1);
    });

    it('неуправляемый вид после создания не меняется: это правило React', () => {
        const {rerender} = render(<Range label="Цена" min={0} max={100} defaultValue={[20, 70]}/>);
        rerender(<Range label="Цена" min={0} max={100} defaultValue={40}/>);

        // defaultValue читается один раз; переключают через key
        expect(inputs()).toHaveLength(2);
    });

    it('у каждого шарика своё имя, собранное из подписи', () => {
        render(<Pair/>);

        expect(screen.getByRole('slider', {name: 'Цена от'})).toBeInTheDocument();
        expect(screen.getByRole('slider', {name: 'Цена до'})).toBeInTheDocument();
    });

    it('имена шариков можно заменить', () => {
        render(<Range label="Срок" min={0} max={10} defaultValue={[2, 8]} thumbs={['начало', 'конец']}/>);

        expect(screen.getByRole('slider', {name: 'Срок начало'})).toBeInTheDocument();
        expect(screen.getByRole('slider', {name: 'Срок конец'})).toBeInTheDocument();
    });

    it('границы полей полные: от них зависит пересчёт нажатия', () => {
        render(<Pair/>);
        const [low, high] = inputs();

        expect(low).toHaveAttribute('min', '0');
        expect(low).toHaveAttribute('max', '100');
        expect(high).toHaveAttribute('min', '0');
        expect(high).toHaveAttribute('max', '100');
    });

    it('объявленные границы — предел соседа, как советует APG', () => {
        render(<Pair/>);
        const [low, high] = inputs();

        expect(low).toHaveAttribute('aria-valuemax', '70');
        expect(high).toHaveAttribute('aria-valuemin', '20');
    });

    it('младшее не проходит сквозь старшее', () => {
        const onChange = vi.fn();
        render(<Pair onChange={onChange}/>);

        fireEvent.change(inputs()[0], {target: {value: '90'}});

        expect(onChange).toHaveBeenCalledWith([70, 70]);
    });

    it('старшее не проходит сквозь младшее', () => {
        const onChange = vi.fn();
        render(<Pair onChange={onChange}/>);

        fireEvent.change(inputs()[1], {target: {value: '5'}});

        expect(onChange).toHaveBeenCalledWith([20, 20]);
    });

    it('упор переносится на объявленные границы', () => {
        render(<Pair/>);
        fireEvent.change(inputs()[0], {target: {value: '70'}});

        expect(inputs()[1]).toHaveAttribute('aria-valuemin', '70');
    });

    it('оба значения уходят в форму одним именем, младшее вперёд', () => {
        render(
            <form>
                <Range label="Цена" name="price" min={0} max={100} defaultValue={[20, 70]}/>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;

        expect(new FormData(form).getAll('price')).toEqual(['20', '70']);
    });

    it('без значения пара встаёт на оба края шкалы', () => {
        render(<Range label="Цена" min={10} max={90} defaultValue={[10, 90]}/>);
        const [low, high] = inputs();

        expect(low).toHaveValue('10');
        expect(high).toHaveValue('90');
    });

    it('притяжка работает у обоих шариков', () => {
        const onChange = vi.fn();
        render(
            <Range
                label="Срок" min={0} max={10} marks={[2, 4, 8]} snap
                value={[0, 10]} onChange={onChange}
            />,
        );

        fireEvent.change(inputs()[1], {target: {value: '7.4'}});

        expect(onChange).toHaveBeenCalledWith([0, 8]);
    });

    it('проходит axe', async () => {
        const {container} = render(<Pair/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });
});

describe('Range: подписи шкалы', () => {
    it('края шкалы подписаны вместе с точками', () => {
        render(<Range label="Срок" min={0} max={10} marks={[2, 4, 8]}/>);

        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('своя подпись края не подменяется числом', () => {
        render(
            <Range
                label="Класс" min={0} max={10}
                marks={[{value: 0, label: 'эконом'}, {value: 10, label: 'бизнес'}]}
            />,
        );

        expect(screen.getByText('эконом')).toBeInTheDocument();
        expect(screen.queryByText('0')).toBeNull();
    });

    it('без точек подписей нет вовсе: голой шкале они не нужны', () => {
        const {container} = render(<Range label="Громкость" min={0} max={100} defaultValue={40}/>);

        expect(container.querySelector('[class*="marks"]')).toBeNull();
    });

    it('крайние подписи равняются по краю, а не по центру', () => {
        const {container} = render(<Range label="Срок" min={0} max={10} marks={[5]}/>);
        const labels = Array.from(container.querySelectorAll('[class*="mark"][data-edge]'));

        expect(labels.map(node => node.getAttribute('data-edge'))).toEqual(['start', 'end']);
    });
});

describe('Range: наименьший промежуток между шариками', () => {
    function Gap({difference = 10, start = [20, 70] as [number, number], onChange}: {
        difference?: number,
        start?: [number, number],
        onChange?: (value: [number, number]) => void,
    }) {
        const [value, setValue] = useState<[number, number]>(start);

        return (
            <Range
                label="Цена" min={0} max={100} minDifference={difference}
                value={value}
                onChange={next => { setValue(next); onChange?.(next); }}
            />
        );
    }

    it('младшее не подходит к старшему ближе промежутка', () => {
        const onChange = vi.fn();
        render(<Gap onChange={onChange}/>);

        fireEvent.change(inputs()[0], {target: {value: '95'}});

        expect(onChange).toHaveBeenCalledWith([60, 70]);
    });

    it('старшее не подходит к младшему ближе промежутка', () => {
        const onChange = vi.fn();
        render(<Gap onChange={onChange}/>);

        fireEvent.change(inputs()[1], {target: {value: '5'}});

        expect(onChange).toHaveBeenCalledWith([20, 30]);
    });

    it('промежуток объявлен в дереве доступности', () => {
        render(<Gap/>);
        const [low, high] = inputs();

        expect(low).toHaveAttribute('aria-valuemax', '60');
        expect(high).toHaveAttribute('aria-valuemin', '30');
    });

    it('по умолчанию промежутка нет: шарики сходятся вплотную', () => {
        const onChange = vi.fn();
        render(
            <Range label="Цена" min={0} max={100} value={[20, 70]} onChange={onChange}/>,
        );

        fireEvent.change(inputs()[0], {target: {value: '95'}});

        expect(onChange).toHaveBeenCalledWith([70, 70]);
    });

    it('движение в свободную сторону промежуток не мешает', () => {
        const onChange = vi.fn();
        render(<Gap onChange={onChange}/>);

        fireEvent.change(inputs()[0], {target: {value: '5'}});

        expect(onChange).toHaveBeenCalledWith([5, 70]);
    });

    it('при притяжке шарик встаёт на точку, которая промежуток не нарушает', () => {
        const onChange = vi.fn();
        render(
            <Range
                label="Срок" min={0} max={10} marks={[2, 4, 8]} snap minDifference={4}
                value={[0, 8]} onChange={onChange}
            />,
        );

        // ближайшая к 7 точка — 8, но она нарушает промежуток: остаётся 4
        fireEvent.change(inputs()[0], {target: {value: '7'}});

        expect(onChange).toHaveBeenCalledWith([4, 8]);
    });

    it('промежуток шире оставшегося места не двигает шарик вовсе', () => {
        const onChange = vi.fn();
        render(<Gap difference={60} start={[0, 50]} onChange={onChange}/>);

        fireEvent.change(inputs()[0], {target: {value: '10'}});

        expect(onChange).not.toHaveBeenCalled();
    });
});
