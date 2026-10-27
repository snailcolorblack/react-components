import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {describe, expect, it, vi} from 'vitest';
import {Pagination} from './Pagination';

/*
 * Разметка, имена, арифметика номеров и выбор страницы. Чего здесь нет:
 * сокращения на узком месте — его делает @container, то есть движок,
 * которого в jsdom не существует. Проверяется то, чем управляет
 * компонент: пометки data-far и data-when, по которым это сокращение
 * и работает.
 *
 * Замерено в Chromium 141 — ниже 30rem номера за узким окном пропадают,
 * а отложенные многоточия появляются на их месте.
 */

/** Что отрисовано целиком: номера, многоточия и пометки. */
function shape(container: HTMLElement) {
    return [...container.querySelectorAll('li')].map(item => {
        const text = item.textContent;

        if (item.dataset.when !== undefined) return `…${item.dataset.when === 'narrow' ? '?' : ''}`;
        if (item.dataset.far !== undefined) return `${text}?`;

        return text;
    });
}

describe('Pagination: какие номера показаны', () => {
    /*
     * Знак вопроса — то, что видно только на широком месте: номер
     * за узким окном или многоточие, которое его заменит.
     */
    function набор(page: number, total: number) {
        const {container, unmount} = render(<Pagination page={page} total={total} arrows={false} edges={false}/>);
        const result = shape(container);
        unmount();

        return result.join(' ');
    }

    it('многоточие ставится и ради одной страницы', () => {
        /*
         * Семь страниц, окно в два соседа: шестая не попадает ни в окно,
         * ни в край. Подменять многоточие самой страницей заманчиво —
         * места столько же, — но тогда узкий набор, прячущий пятую,
         * оставил бы дыру без всякого признака пропуска.
         */
        expect(набор(3, 7)).toBe('1 2 3 4 5? … 7');
    });

    it('середина длинного списка: края, многоточия и окно', () => {
        expect(набор(10, 20)).toBe('1 … 8? 9 10 11 12? … 20');
    });

    it('начало: многоточие только справа', () => {
        expect(набор(1, 20)).toBe('1 2 3? … 20');
    });

    it('конец: многоточие только слева', () => {
        expect(набор(20, 20)).toBe('1 … 18? 19 20');
    });

    it('у края многоточие появляется, только когда есть что скрывать', () => {
        /* 1 2 3 4 5 — между краем и окном пусто, разрыва нет. */
        expect(набор(3, 20)).toBe('1 2 3 4 5? … 20');
    });

    it('отложенное многоточие: разрыв появится только после сокращения', () => {
        /*
         * Широкому набору разрыв не нужен — 4 идёт сразу за 3. Но узкий
         * прячет 4, и между 3 и 5 образуется дыра: многоточие для неё
         * отрисовано заранее и помечено.
         */
        expect(набор(6, 9)).toBe('1 … 4? 5 6 7 8? …? 9');
    });

    it('две страницы — обе на месте', () => {
        expect(набор(1, 2)).toBe('1 2');
    });

    it('одна страница — навигации нет вовсе', () => {
        const {container} = render(<Pagination page={1} total={1}/>);

        expect(container).toBeEmptyDOMElement();
    });

    it('число соседей и краёв меняется пропами', () => {
        const {container} = render(
            <Pagination page={10} total={20} siblings={1} boundaries={2} arrows={false} edges={false}/>,
        );

        expect(shape(container).join(' ')).toBe('1 2 … 9 10 11 … 19 20');
    });

    it('страница за пределами шкалы приводится к ближайшей', () => {
        render(<Pagination page={99} total={5} arrows={false} edges={false}/>);

        expect(screen.getByRole('button', {name: 'Страница 5'})).toHaveAttribute('aria-current', 'page');
    });
});

describe('Pagination: ссылки и кнопки', () => {
    it('без href номера — кнопки', () => {
        render(<Pagination page={2} total={5}/>);

        expect(screen.getByRole('button', {name: 'Страница 3'}).tagName).toBe('BUTTON');
        expect(screen.queryAllByRole('link')).toHaveLength(0);
    });

    it('с href номера — ссылки с настоящим адресом', () => {
        render(<Pagination page={2} total={5} href={page => `/товары?с=${page}`}/>);
        const third = screen.getByRole('link', {name: 'Страница 3'});

        expect(third.tagName).toBe('A');
        expect(third).toHaveAttribute('href', '/товары?с=3');
    });

    it('стрелки тоже ведут на свои страницы', () => {
        render(<Pagination page={3} total={9} href={page => `/с/${page}`}/>);

        expect(screen.getByRole('link', {name: 'Предыдущая страница'})).toHaveAttribute('href', '/с/2');
        expect(screen.getByRole('link', {name: 'Следующая страница'})).toHaveAttribute('href', '/с/4');
        expect(screen.getByRole('link', {name: 'Первая страница'})).toHaveAttribute('href', '/с/1');
        expect(screen.getByRole('link', {name: 'Последняя страница'})).toHaveAttribute('href', '/с/9');
    });

    it('на первой странице «назад» и «в начало» — выключенные кнопки, а не ссылки без адреса', () => {
        render(<Pagination page={1} total={9} href={page => `/с/${page}`}/>);
        const back = screen.getByRole('button', {name: 'Предыдущая страница'});

        expect(back.tagName).toBe('BUTTON');
        expect(back).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Первая страница'})).toBeDisabled();
        /* А вперёд — по-прежнему ссылка. */
        expect(screen.getByRole('link', {name: 'Следующая страница'})).toBeInTheDocument();
    });

    it('на последней выключены «вперёд» и «в конец»', () => {
        render(<Pagination page={9} total={9}/>);

        expect(screen.getByRole('button', {name: 'Следующая страница'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Последняя страница'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Предыдущая страница'})).toBeEnabled();
    });

    it('стрелки и края убираются пропами', () => {
        render(<Pagination page={3} total={9} arrows={false} edges={false}/>);

        expect(screen.queryByRole('button', {name: /страница$/i})).toBeNull();
    });
});

describe('Pagination: выбор страницы', () => {
    it('нажатие на номер отдаёт его наружу', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<Pagination page={2} total={9} onChange={onChange}/>);

        await user.click(screen.getByRole('button', {name: 'Страница 4'}));

        expect(onChange).toHaveBeenCalledWith(4, expect.anything());
    });

    it('стрелки считают соседнюю страницу сами', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<Pagination page={5} total={9} onChange={onChange}/>);

        await user.click(screen.getByRole('button', {name: 'Следующая страница'}));
        await user.click(screen.getByRole('button', {name: 'Предыдущая страница'}));
        await user.click(screen.getByRole('button', {name: 'Первая страница'}));
        await user.click(screen.getByRole('button', {name: 'Последняя страница'}));

        expect(onChange.mock.calls.map(([page]) => page)).toEqual([6, 4, 1, 9]);
    });

    it('нажатие на текущую страницу ничего не вызывает', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<Pagination page={3} total={9} onChange={onChange}/>);

        await user.click(screen.getByRole('button', {name: 'Страница 3'}));

        expect(onChange).not.toHaveBeenCalled();
    });

    it('в режиме ссылок onChange приходит до перехода и его можно отменить', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn((_page, event: React.MouseEvent) => event.preventDefault());
        render(<Pagination page={1} total={9} href={page => `/с/${page}`} onChange={onChange}/>);

        await user.click(screen.getByRole('link', {name: 'Страница 2'}));

        expect(onChange).toHaveBeenCalledWith(2, expect.anything());
        expect(onChange.mock.calls[0][1].defaultPrevented).toBe(true);
    });
});

describe('Pagination: доступность', () => {
    it('это ориентир со своим именем и списком внутри', () => {
        render(<Pagination page={3} total={9}/>);
        const nav = screen.getByRole('navigation', {name: 'Постраничная навигация'});

        expect(nav).toBeInTheDocument();
        expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('текущая страница помечена aria-current', () => {
        render(<Pagination page={3} total={9}/>);

        expect(screen.getByRole('button', {name: 'Страница 3'})).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('button', {name: 'Страница 4'})).not.toHaveAttribute('aria-current');
    });

    it('имя номера содержит сам номер: иначе голосом её не назвать (WCAG 2.5.3)', () => {
        render(<Pagination page={3} total={9}/>);
        const third = screen.getByRole('button', {name: 'Страница 4'});

        expect(third.textContent).toBe('4');
        expect(third.getAttribute('aria-label')).toContain('4');
    });

    it('надпись «Страница 3 из 20» объявляется вместе с именем навигации', () => {
        render(<Pagination page={3} total={20}/>);
        const nav = screen.getByRole('navigation');
        const described = document.getElementById(nav.getAttribute('aria-describedby') ?? '');

        expect(described).toHaveTextContent('Страница 3 из 20');
    });

    it('надпись убирается и делается своей', () => {
        const {rerender} = render(<Pagination page={3} total={20} status={false}/>);
        expect(screen.queryByText(/из 20/)).toBeNull();

        rerender(<Pagination page={3} total={20} status={(page, total) => `${page} / ${total}`}/>);
        expect(screen.getByText('3 / 20')).toBeInTheDocument();
    });

    it('многоточие скринридеру не читается', () => {
        const {container} = render(<Pagination page={10} total={20}/>);
        const gap = container.querySelector('[data-when]')?.firstElementChild;

        expect(gap).toHaveAttribute('aria-hidden', 'true');
    });

    it('подписи меняются целиком', () => {
        render(
            <Pagination
                page={3} total={9} label="Pages"
                labels={{page: page => `Page ${page}`, next: 'Next page'}}
            />,
        );

        expect(screen.getByRole('navigation', {name: 'Pages'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Page 4'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Next page'})).toBeInTheDocument();
        /* Не перечисленные остаются прежними. */
        expect(screen.getByRole('button', {name: 'Предыдущая страница'})).toBeInTheDocument();
    });

    it('проходит axe', async () => {
        const {container} = render(<Pagination page={10} total={20}/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('ссылками тоже проходит axe', async () => {
        const {container} = render(<Pagination page={10} total={20} href={page => `/с/${page}`}/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Pagination page={5} total={40} href={page => `/с/${page}`}/>);

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});

describe('Pagination: арифметика не ломается ни на одной странице', () => {
    /*
     * Перебор вместо отдельных случаев: краевые ошибки в этой раскладке
     * живут именно на стыках окна с краями.
     */
    it.each([2, 3, 5, 7, 9, 12, 20, 101])('всего %i страниц', total => {
        for (let page = 1; page <= total; page++) {
            const {container, unmount} = render(
                <Pagination page={page} total={total} arrows={false} edges={false}/>,
            );
            const items = shape(container);
            const pages = items
                .filter(text => text !== undefined && /^\d+\??$/.test(text))
                .map(text => Number.parseInt(text!, 10));

            /* Номера идут строго по возрастанию и не повторяются. */
            expect(pages).toEqual([...pages].sort((a, b) => a - b));
            expect(new Set(pages).size).toBe(pages.length);
            /* Края и текущая страница есть всегда. */
            expect(pages).toContain(1);
            expect(pages).toContain(total);
            expect(pages).toContain(page);
            /* Между соседними номерами либо нет дыры, либо стоит многоточие. */
            items.forEach((text, index) => {
                if (text === undefined || !/^\d+\??$/.test(text)) return;

                const previous = items[index - 1];

                if (previous === undefined || !/^\d+\??$/.test(previous)) return;

                expect(Number.parseInt(text, 10) - Number.parseInt(previous, 10)).toBe(1);
            });

            unmount();
        }
    });
});
