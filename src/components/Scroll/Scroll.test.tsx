import {render, screen} from '@testing-library/react';
import axe from 'axe-core';
import {createRef} from 'react';
import {describe, expect, it} from 'vitest';
import {Scroll} from './Scroll';

/*
 * Разметка, роли и табуляция. Чего здесь нет: самой прокрутки. Колесо,
 * привязка к элементам и отдача прокрутки странице на краю — это движок,
 * которого в jsdom не существует (scrollWidth там всегда 0, и перехват
 * выходит из обработчика первой же проверкой).
 *
 * Измерено в Chromium 141: один щелчок колеса сдвигает свободную ленту
 * на 100px, а ленту с привязкой — ровно на один элемент (144px при шаге
 * 160 и scroll-padding 16); три быстрых щелчка дают 300px и три элемента
 * соответственно; на краю без trap прокрутка уходит странице, с trap —
 * не уходит; вертикальную ленту колесо листает само; в RTL лента едет
 * в свою сторону.
 */

const CARDS = ['Один', 'Два', 'Три'];

function cards() {
    return CARDS.map(card => <div key={card}>{card}</div>);
}

describe('Scroll: разметка', () => {
    it('по умолчанию это div, который едет вдоль строки и свободно', () => {
        const {container} = render(<Scroll label="Лента">{cards()}</Scroll>);
        const node = container.firstElementChild as HTMLElement;

        expect(node.tagName).toBe('DIV');
        expect(node).toHaveAttribute('data-axis', 'inline');
        expect(node).toHaveAttribute('data-mode', 'smooth');
        expect(node).not.toHaveAttribute('data-trap');
    });

    it('ось и способ остановки уходят в разметку: по ним работает и CSS, и колесо', () => {
        const {container} = render(<Scroll axis="block" mode="fixed" label="Лента">{cards()}</Scroll>);
        const node = container.firstElementChild as HTMLElement;

        expect(node).toHaveAttribute('data-axis', 'block');
        expect(node).toHaveAttribute('data-mode', 'fixed');
    });

    it('удержание прокрутки объявляется атрибутом', () => {
        const {container} = render(<Scroll trap label="Лента">{cards()}</Scroll>);

        expect(container.firstElementChild).toHaveAttribute('data-trap');
    });

    it('тег меняется пропом as, содержимое остаётся прямыми детьми', () => {
        const {container} = render(
            <Scroll as="ul" label="Список">
                {CARDS.map(card => <li key={card}>{card}</li>)}
            </Scroll>,
        );
        const node = container.firstElementChild as HTMLElement;

        expect(node.tagName).toBe('UL');
        expect(node.children).toHaveLength(3);
        expect(screen.getByRole('list', {name: 'Список'})).toBe(node);
    });

    it('свой класс не вытесняет собственный', () => {
        const {container} = render(<Scroll className="мой" label="Лента">{cards()}</Scroll>);
        const node = container.firstElementChild as HTMLElement;

        expect(node.className).toContain('мой');
        expect(node.className.split(' ').length).toBeGreaterThan(1);
    });

    it('ref доходит до узла, несмотря на собственный обработчик колеса', () => {
        const ref = createRef<HTMLDivElement>();
        render(<Scroll ref={ref} label="Лента">{cards()}</Scroll>);

        expect(ref.current).toBeInstanceOf(HTMLElement);
        expect(ref.current).toHaveAttribute('data-axis', 'inline');
    });

    it('чужие пропсы доезжают до узла', () => {
        const {container} = render(<Scroll id="лента" data-test="да" label="Лента">{cards()}</Scroll>);
        const node = container.firstElementChild as HTMLElement;

        expect(node).toHaveAttribute('id', 'лента');
        expect(node).toHaveAttribute('data-test', 'да');
    });
});

describe('Scroll: клавиатура', () => {
    /*
     * Прокручиваемая область без фокусируемого содержимого недоступна
     * с клавиатуры (WCAG 2.1.1): Chromium, в отличие от Firefox, сам
     * остановкой её не делает. Поэтому лента смотрит на содержимое
     * и решает по нему.
     */

    it('без фокусируемых внутри лента сама становится остановкой и получает имя', () => {
        render(<Scroll label="Галерея">{cards()}</Scroll>);
        const node = screen.getByRole('group', {name: 'Галерея'});

        expect(node).toHaveAttribute('tabindex', '0');
    });

    it('со ссылками внутри лишней остановки не появляется', () => {
        const {container} = render(
            <Scroll label="Карточки">
                {CARDS.map(card => <a key={card} href="#a">{card}</a>)}
            </Scroll>,
        );
        const node = container.firstElementChild as HTMLElement;

        expect(node).not.toHaveAttribute('tabindex');
        expect(node).not.toHaveAttribute('role');
    });

    it('кнопки внутри считаются так же, как ссылки', () => {
        const {container} = render(
            <Scroll label="Карточки">
                {CARDS.map(card => <button key={card} type="button">{card}</button>)}
            </Scroll>,
        );

        expect(container.firstElementChild).not.toHaveAttribute('tabindex');
    });

    it('выключенный из табуляции tabindex="-1" за фокусируемый не считается', () => {
        const {container} = render(
            <Scroll label="Карточки">
                {CARDS.map(card => <div key={card} tabIndex={-1}>{card}</div>)}
            </Scroll>,
        );

        expect(container.firstElementChild).toHaveAttribute('tabindex', '0');
    });

    it('своей роли у тега не отнимает: ul остаётся списком', () => {
        render(<Scroll as="ul" label="Список">{CARDS.map(card => <li key={card}>{card}</li>)}</Scroll>);
        const node = screen.getByRole('list', {name: 'Список'});

        expect(node).toHaveAttribute('tabindex', '0');
    });

    it('чужая роль важнее придуманной', () => {
        const {container} = render(<Scroll role="region" label="Лента">{cards()}</Scroll>);

        expect(container.firstElementChild).toHaveAttribute('role', 'region');
    });

    it('содержимое поменялось — решение пересматривается', () => {
        const {container, rerender} = render(<Scroll label="Лента">{cards()}</Scroll>);
        expect(container.firstElementChild).toHaveAttribute('tabindex', '0');

        rerender(<Scroll label="Лента"><a href="#a">Ссылка</a></Scroll>);
        expect(container.firstElementChild).not.toHaveAttribute('tabindex');
    });

    it('проходит axe', async () => {
        const {container} = render(<Scroll label="Галерея">{cards()}</Scroll>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('лента со ссылками тоже проходит axe', async () => {
        const {container} = render(
            <Scroll label="Карточки">{CARDS.map(card => <a key={card} href="#a">{card}</a>)}</Scroll>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });
});

describe('Scroll: растушёвка, стрелки и выход за отступы', () => {
    /*
     * Сами эффекты — это движок: маска с scroll-driven анимацией
     * и ::scroll-button(). В jsdom нет ни того, ни другого, поэтому здесь
     * проверяется только то, чем управляет компонент: атрибуты, по которым
     * работает CSS, и переменная с отступом.
     *
     * Замерено в Chromium 141: растушёвка показывается лишь с той стороны,
     * где есть продолжение (в начале 1 и 0, посередине 0 и 0, в конце 0 и 1);
     * в RTL градиент переворачивается; стрелки попадают в дерево доступности
     * настоящими кнопками с именами «Назад» и «Вперёд», крайняя выключена
     * браузером; шаг стрелки — один элемент у ленты с привязкой и почти
     * экран у свободной; лента с bleed занимает всю ширину карточки,
     * а первый и последний элементы стоят от её краёв ровно на отступ
     * родителя.
     */

    function cardWith(ui: React.ReactNode) {
        return render(<div style={{padding: '32px'}}>{ui}</div>);
    }

    it('по умолчанию ни растушёвки, ни стрелок, ни выхода за отступы', () => {
        const {container} = render(<Scroll label="Лента">{cards()}</Scroll>);
        const node = container.firstElementChild as HTMLElement;

        expect(node).not.toHaveAttribute('data-fade');
        expect(node).not.toHaveAttribute('data-arrows');
        expect(node).not.toHaveAttribute('data-bleed');
    });

    it('растушёвка и стрелки объявляются атрибутами', () => {
        const {container} = render(<Scroll fade arrows label="Лента">{cards()}</Scroll>);
        const node = container.firstElementChild as HTMLElement;

        expect(node).toHaveAttribute('data-fade');
        expect(node).toHaveAttribute('data-arrows');
    });

    it('отступ строкой берётся как есть, родитель не измеряется', () => {
        const {container} = cardWith(<Scroll bleed="2rem" label="Лента">{cards()}</Scroll>);
        const node = container.querySelector('[data-axis]') as HTMLElement;

        expect(node).toHaveAttribute('data-bleed');
        expect(node.style.getPropertyValue('--scroll-bleed')).toBe('2rem');
    });

    it('bleed без значения снимает отступ с родителя', () => {
        const {container} = cardWith(<Scroll bleed label="Лента">{cards()}</Scroll>);
        const node = container.querySelector('[data-axis]') as HTMLElement;

        expect(node.style.getPropertyValue('--scroll-bleed')).toBe('32px');
    });

    it('у вертикальной ленты снимается отступ по своей оси', () => {
        const {container} = render(
            <div style={{paddingTop: '24px', paddingLeft: '8px'}}>
                <Scroll axis="block" bleed label="Лента">{cards()}</Scroll>
            </div>,
        );
        const node = container.querySelector('[data-axis]') as HTMLElement;

        expect(node.style.getPropertyValue('--scroll-bleed')).toBe('24px');
    });

    it('без bleed переменная не ставится вовсе', () => {
        const {container} = cardWith(<Scroll label="Лента">{cards()}</Scroll>);
        const node = container.querySelector('[data-axis]') as HTMLElement;

        expect(node.style.getPropertyValue('--scroll-bleed')).toBe('');
    });

    it('полоса прокрутки прячется пропом', () => {
        const {container, rerender} = render(<Scroll label="Лента">{cards()}</Scroll>);
        expect(container.firstElementChild).not.toHaveAttribute('data-bar');

        rerender(<Scroll bar={false} label="Лента">{cards()}</Scroll>);
        expect(container.firstElementChild).toHaveAttribute('data-bar', 'none');
    });

    it('растушёвка и стрелки не трогают ни роль, ни имя, ни табуляцию', () => {
        render(<Scroll fade arrows label="Галерея">{cards()}</Scroll>);
        const node = screen.getByRole('group', {name: 'Галерея'});

        expect(node).toHaveAttribute('tabindex', '0');
    });

    it('всё вместе проходит axe', async () => {
        const {container} = cardWith(<Scroll bleed fade arrows label="Галерея">{cards()}</Scroll>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });
});
