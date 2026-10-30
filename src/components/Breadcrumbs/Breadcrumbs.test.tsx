import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {describe, expect, it, vi} from 'vitest';
import {Breadcrumbs} from './Breadcrumbs';
import type {Crumb} from './Breadcrumbs.interface.ts';

/*
 * Разметка, имена, сворачивание и переходы. Чего здесь нет: самого
 * сворачивания по ширине — его считает @container, которого в jsdom
 * нет. Проверяются пометки data-cut, data-mid, data-far и data-when,
 * по которым оно и работает.
 *
 * Стили при этом применяются по-настоящему: модуль CSS в этой сборке
 * попадает в jsdom. Поэтому кнопка «…» с пометкой порога здесь скрыта
 * ровно так же, как на широком экране, и достать её запросом по роли
 * нельзя — тесты самой кнопки идут со сворачиванием числом, где она
 * видна всегда.
 *
 * Замерено в Chromium 141: ниже 40rem пропадают звенья с data-mid,
 * ниже 22rem — с data-far, и кнопка появляется на их месте.
 */

const ПУТЬ: Crumb[] = [
    {label: 'Главная', href: '/'},
    {label: 'Банк', href: '/bank'},
    {label: 'Переводы', href: '/bank/transfers'},
    {label: 'Счета', href: '/bank/accounts'},
    {label: 'Выписки', href: '/bank/accounts/statements'},
    {label: 'Март 2026'},
];

/**
 * Что отрисовано целиком, со знаком пометки:
 *
 * «×» — спрятано всегда (так попросили числом);
 * «~» — пропадёт, когда коробка станет теснее 40rem;
 * «?» — пропадёт, когда коробка станет уже 22rem.
 */
function shape(container: HTMLElement) {
    return [...container.querySelectorAll('li')].map(item => {
        /* Разделитель в подпись не входит: он отдельный кусок разметки. */
        const text = item.firstElementChild?.textContent ?? '';
        const знак = item.dataset.cut !== undefined ? '×'
            : item.dataset.mid !== undefined || item.dataset.when === 'mid' ? '~'
                : item.dataset.far !== undefined || item.dataset.when === 'narrow' ? '?'
                    : '';

        return `${text}${знак}`;
    }).join(' ');
}

describe('Breadcrumbs: разметка', () => {
    it('это навигация со списком', () => {
        const {container} = render(<Breadcrumbs items={ПУТЬ}/>);

        expect(screen.getByRole('navigation', {name: 'Хлебные крошки'})).toBeInTheDocument();
        expect(container.querySelector('ol')).not.toBeNull();
        expect(container.querySelectorAll('li').length).toBeGreaterThan(0);
    });

    it('имя навигации меняется: двух одинаковых ориентиров быть не должно', () => {
        render(<Breadcrumbs items={ПУТЬ} label="Где вы находитесь"/>);

        expect(screen.getByRole('navigation', {name: 'Где вы находитесь'})).toBeInTheDocument();
    });

    it('текущая страница — не ссылка, а текст с aria-current', () => {
        const {container} = render(<Breadcrumbs items={ПУТЬ}/>);
        const current = container.querySelector('[aria-current="page"]')!;

        expect(current.textContent).toBe('Март 2026');
        expect(current.tagName.toLowerCase()).toBe('span');
        expect(screen.queryByRole('link', {name: 'Март 2026'})).toBeNull();
    });

    it('у последнего звена адрес не делает его ссылкой', () => {
        /* Ссылка на страницу, где ты уже стоишь, обещает переход,
           которого нет. */
        render(<Breadcrumbs items={[{label: 'Главная', href: '/'}, {label: 'Тут', href: '/тут'}]}/>);

        expect(screen.queryByRole('link', {name: 'Тут'})).toBeNull();
    });

    it('звено без адреса остаётся текстом, а не пустой ссылкой', () => {
        /* Ссылка без href выпадает и из табуляции, и из дерева доступности:
           она не говорит «сюда нельзя», она просто исчезает. */
        render(<Breadcrumbs items={[{label: 'Настройки'}, {label: 'Профиль'}]}/>);

        expect(screen.queryAllByRole('link')).toHaveLength(0);
        expect(screen.getByText('Настройки')).toBeInTheDocument();
    });

    it('разделители спрятаны от скринридера и не входят в имя ссылки', () => {
        const {container} = render(<Breadcrumbs items={ПУТЬ} collapse={false}/>);
        /* После каждого звена, кроме текущего, и после кнопки «…» —
           она тоже стоит в ряду и тоже отделена от соседа. */
        const знаки = [...container.querySelectorAll('[aria-hidden="true"]')]
            .filter(node => node.textContent === '/');

        expect(знаки).toHaveLength(container.querySelectorAll('li').length - 1);
        expect(screen.getByRole('link', {name: 'Банк'})).toBeInTheDocument();
    });

    it('разделитель заменяется своим', () => {
        const {container} = render(<Breadcrumbs items={ПУТЬ} separator="›" collapse={false}/>);

        expect(container.textContent).toContain('›');
        expect(container.textContent).not.toContain('/');
    });

    it('пустой путь не рисуется вовсе', () => {
        const {container} = render(<Breadcrumbs items={[]}/>);

        expect(container.firstChild).toBeNull();
    });

    it('путь из одного звена — только текущая страница', () => {
        const {container} = render(<Breadcrumbs items={[{label: 'Главная'}]}/>);

        expect(shape(container)).toBe('Главная');
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('свой класс не вытесняет собственный', () => {
        const {container} = render(<Breadcrumbs items={ПУТЬ} className="мой"/>);
        const node = container.firstElementChild as HTMLElement;

        expect(node.className).toContain('мой');
        expect(node.className.split(' ').length).toBeGreaterThan(1);
    });
});

describe('Breadcrumbs: когда сворачивать', () => {
    it('по умолчанию длина пути ничего не прячет: решает ширина', () => {
        /*
         * Это и есть смысл 'fit': на широком экране путь виден целиком,
         * сколько бы в нём ни было звеньев. Спрятанного «всегда» нет —
         * есть только пометки порогов.
         */
        const {container} = render(<Breadcrumbs items={ПУТЬ}/>);

        expect(container.querySelector('[data-cut]')).toBeNull();
        expect(shape(container)).toBe('Главная …~ Банк~ Переводы~ Счета~ Выписки? Март 2026');
    });

    it('число прячет середину независимо от ширины', () => {
        const {container} = render(<Breadcrumbs items={ПУТЬ} collapse={4}/>);

        expect(shape(container)).toBe('Главная … Банк× Переводы× Счета× Выписки? Март 2026');
    });

    it('путь короче числа не сворачивается по количеству', () => {
        const {container} = render(<Breadcrumbs items={ПУТЬ.slice(0, 4)} collapse={4}/>);

        /* Ни одного спрятанного «всегда»: остаётся только узкий порог,
           и кнопка помечена им же. */
        expect(container.querySelector('[data-cut]')).toBeNull();
        expect(shape(container)).toBe('Главная …? Банк? Переводы? Счета');
    });

    it('сколько оставлять с краёв — пропами', () => {
        const {container} = render(<Breadcrumbs items={ПУТЬ} collapse={4} head={2} tail={1}/>);

        /* «?» у Банка — это узкое место: там остаются только первое
           звено и текущее, сколько бы ни просили оставить по краям. */
        expect(shape(container)).toBe('Главная Банк? … Переводы× Счета× Выписки× Март 2026');
    });

    it('collapse={false} не прячет ничего и ни при какой ширине', () => {
        const {container} = render(<Breadcrumbs items={ПУТЬ} collapse={false}/>);

        expect(container.querySelector('[data-cut]')).toBeNull();
        expect(container.querySelector('[data-mid]')).toBeNull();
        expect(container.querySelector('[data-far]')).toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('ради одного спрятанного звена «…» не ставится', () => {
        /*
         * «…» на месте единственного звена занимает ровно столько же
         * места и не выигрывает ничего, зато отнимает подпись.
         */
        const {container} = render(<Breadcrumbs items={ПУТЬ.slice(0, 5)} collapse={4} head={1} tail={3}/>);

        expect(container.querySelector('[data-cut]')).toBeNull();
    });
});

describe('Breadcrumbs: кнопка «…»', () => {
    it('свёрнутый путь раскрывается и сворачивается обратно', async () => {
        const user = userEvent.setup();
        const {container} = render(<Breadcrumbs items={ПУТЬ} collapse={4}/>);
        const more = screen.getByRole('button', {name: 'Показать путь целиком'});

        expect(more).toHaveAttribute('aria-expanded', 'false');
        expect(container.firstElementChild).not.toHaveAttribute('data-open');

        await user.click(more);

        expect(screen.getByRole('button', {name: 'Свернуть путь'})).toHaveAttribute('aria-expanded', 'true');
        expect(container.firstElementChild).toHaveAttribute('data-open');

        await user.click(screen.getByRole('button', {name: 'Свернуть путь'}));

        expect(container.firstElementChild).not.toHaveAttribute('data-open');
    });

    it('раскрытие не уводит фокус: кнопка остаётся на месте', async () => {
        const user = userEvent.setup();
        render(<Breadcrumbs items={ПУТЬ} collapse={4}/>);

        await user.click(screen.getByRole('button', {name: 'Показать путь целиком'}));

        /* Кнопка не исчезла, фокус остался на ней — иначе он улетел бы
           в начало документа, и путь к ней пришлось бы искать заново. */
        expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Свернуть путь'}));
    });

    it('работает с клавиатуры: это обычная кнопка', async () => {
        const user = userEvent.setup();
        render(<Breadcrumbs items={ПУТЬ} collapse={4}/>);

        screen.getByRole('button').focus();
        await user.keyboard('{Enter}');

        expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');

        await user.keyboard(' ');

        expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    });

    it('кнопка помечена тем порогом, с которого она нужна', () => {
        /*
         * В jsdom это единственный способ проверить сворачивание
         * по ширине: @container здесь не вычисляется, а сами стили
         * применяются — кнопка с пометкой скрыта, как и задумано.
         */
        const короткий = render(<Breadcrumbs items={ПУТЬ.slice(0, 3)}/>);
        expect(короткий.container.querySelector('[data-when="narrow"]')).not.toBeNull();
        expect(shape(короткий.container)).toBe('Главная …? Банк? Переводы');
        короткий.unmount();

        const длинный = render(<Breadcrumbs items={ПУТЬ}/>);
        expect(длинный.container.querySelector('[data-when="mid"]')).not.toBeNull();
    });

    it('прятать нечего — кнопки нет вовсе', () => {
        const {container} = render(<Breadcrumbs items={ПУТЬ.slice(0, 2)}/>);

        expect(screen.queryByRole('button')).toBeNull();
        expect(shape(container)).toBe('Главная Банк');
    });

    it('подписи кнопки меняются', () => {
        render(<Breadcrumbs items={ПУТЬ} collapse={4} labels={{expand: 'Show full path'}}/>);

        expect(screen.getByRole('button', {name: 'Show full path'})).toBeInTheDocument();
    });
});

describe('Breadcrumbs: переходы', () => {
    it('onNavigate приходит со звеном и его местом в пути', async () => {
        const user = userEvent.setup();
        const onNavigate = vi.fn((_item, _index, event: React.MouseEvent) => event.preventDefault());
        render(<Breadcrumbs items={ПУТЬ} collapse={false} onNavigate={onNavigate}/>);

        await user.click(screen.getByRole('link', {name: 'Счета'}));

        expect(onNavigate).toHaveBeenCalledTimes(1);
        expect(onNavigate.mock.calls[0][0]).toEqual(ПУТЬ[3]);
        expect(onNavigate.mock.calls[0][1]).toBe(3);
    });

    it('адрес остаётся в разметке: ссылку можно открыть в соседней вкладке', () => {
        render(<Breadcrumbs items={ПУТЬ} collapse={false}/>);

        expect(screen.getByRole('link', {name: 'Банк'})).toHaveAttribute('href', '/bank');
    });
});

describe('Breadcrumbs: доступность', () => {
    it('значок звена именем не становится', () => {
        render(
            <Breadcrumbs
                collapse={false}
                items={[{label: 'Главная', href: '/', icon: <svg/>}, {label: 'Тут'}]}
            />,
        );

        expect(screen.getByRole('link', {name: 'Главная'})).toBeInTheDocument();
    });

    it('своё имя звена сильнее подписи', () => {
        render(<Breadcrumbs collapse={false} items={[{label: 'KZ12…', href: '/a', 'aria-label': 'Счёт KZ12 3456'}, {label: 'Тут'}]}/>);

        expect(screen.getByRole('link', {name: 'Счёт KZ12 3456'})).toBeInTheDocument();
    });

    it('проходит axe и свёрнутым, и раскрытым', async () => {
        const user = userEvent.setup();
        const {container} = render(<Breadcrumbs items={ПУТЬ} collapse={4}/>);

        expect((await axe.run(container, {rules: {'color-contrast': {enabled: false}}})).violations).toEqual([]);

        await user.click(screen.getByRole('button'));

        expect((await axe.run(container, {rules: {'color-contrast': {enabled: false}}})).violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Breadcrumbs items={ПУТЬ}/>);

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
