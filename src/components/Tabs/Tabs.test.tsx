import {useState} from 'react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {Tabs} from './Tabs';

/*
 * Роли, связи, клавиатура и состояние. Чего здесь нет: hidden="until-found"
 * и поиска по странице — их считает движок, которого в jsdom не существует,
 * это браузерный замер.
 */

function Sample({...props}: Partial<Parameters<typeof Tabs>[0]> = {}) {
    return (
        <Tabs defaultValue="about" {...props}>
            <Tabs.Buttons label="Раздел">
                <Tabs.Button value="about">Описание</Tabs.Button>
                <Tabs.Button value="reviews">Отзывы</Tabs.Button>
                <Tabs.Button value="delivery" disabled>Доставка</Tabs.Button>
            </Tabs.Buttons>

            <Tabs.Content value="about">Текст описания</Tabs.Content>
            <Tabs.Content value="reviews">Текст отзывов</Tabs.Content>
            <Tabs.Content value="delivery">Текст доставки</Tabs.Content>
        </Tabs>
    );
}

describe('Tabs: разметка', () => {
    it('роли на месте: список, вкладки, панель', () => {
        render(<Sample/>);

        expect(screen.getByRole('tablist', {name: 'Раздел'})).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(3);
        /* Видима только открытая: закрытые спрятаны и в дерево не попадают. */
        expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    });

    it('кнопка и панель ссылаются друг на друга', () => {
        render(<Sample/>);
        const tab = screen.getByRole('tab', {name: 'Описание'});
        const panel = screen.getByRole('tabpanel');

        expect(tab).toHaveAttribute('aria-controls', panel.id);
        expect(panel).toHaveAttribute('aria-labelledby', tab.id);
        expect(panel).toHaveAccessibleName('Описание');
    });

    it('два набора на странице не путают идентификаторы', () => {
        render(<><Sample/><Sample/></>);
        const ids = screen.getAllByRole('tab').map(node => node.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it('ориентация объявлена списком', () => {
        render(<Sample orientation="vertical"/>);
        expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('без defaultValue не открыта ни одна вкладка', () => {
        render(<Sample defaultValue={undefined}/>);

        expect(screen.queryByRole('tabpanel')).toBeNull();
        expect(screen.getAllByRole('tab').every(node => node.getAttribute('aria-selected') === 'false')).toBe(true);
    });
});

describe('Tabs: переключение', () => {
    it('клик открывает панель и помечает кнопку', async () => {
        render(<Sample/>);

        await userEvent.click(screen.getByRole('tab', {name: 'Отзывы'}));

        expect(screen.getByRole('tab', {name: 'Отзывы'})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', {name: 'Описание'})).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Текст отзывов');
    });

    it('закрытая панель остаётся в разметке', async () => {
        const {container} = render(<Sample/>);

        await userEvent.click(screen.getByRole('tab', {name: 'Отзывы'}));

        /* Ровно три панели в DOM, видима одна: состояние закрытых
           не теряется — ни прокрутка, ни введённый текст. */
        expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(3);
        expect(screen.getAllByRole('tabpanel', {hidden: true})).toHaveLength(3);
    });

    it('выключенная вкладка не открывается', async () => {
        render(<Sample/>);

        await userEvent.click(screen.getByRole('tab', {name: 'Доставка'}));

        expect(screen.getByRole('tab', {name: 'Доставка'})).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Текст описания');
    });

    it('управляемый режим слушается владельца', async () => {
        function Controlled() {
            const [value, setValue] = useState('about');

            return <>
                <Sample value={value} onChange={setValue}/>
                <output>{value}</output>
            </>;
        }

        render(<Controlled/>);
        await userEvent.click(screen.getByRole('tab', {name: 'Отзывы'}));

        expect(screen.getByRole('status')).toHaveTextContent('reviews');
    });

    it('onChange не зовётся на повторный выбор той же вкладки', async () => {
        const onChange = vi.fn();

        render(<Sample onChange={onChange}/>);
        await userEvent.click(screen.getByRole('tab', {name: 'Описание'}));

        expect(onChange).not.toHaveBeenCalled();
    });

    it('свой onClick на кнопке не теряется', async () => {
        const onClick = vi.fn();

        render(
            <Tabs defaultValue="a">
                <Tabs.Buttons label="Раздел">
                    <Tabs.Button value="a" onClick={onClick}>Первая</Tabs.Button>
                </Tabs.Buttons>
                <Tabs.Content value="a">Текст</Tabs.Content>
            </Tabs>,
        );
        await userEvent.click(screen.getByRole('tab'));

        expect(onClick).toHaveBeenCalled();
    });
});

describe('Tabs: клавиатура', () => {
    it('в список ведёт один Tab: остальные кнопки убраны из табуляции', () => {
        render(<Sample/>);
        const tabs = screen.getAllByRole('tab');

        expect(tabs[0]).toHaveAttribute('tabindex', '0');
        expect(tabs[1]).toHaveAttribute('tabindex', '-1');
        expect(tabs[2]).toHaveAttribute('tabindex', '-1');
    });

    it('стрелка сразу открывает следующую вкладку', async () => {
        render(<Sample/>);

        await userEvent.tab();
        expect(screen.getByRole('tab', {name: 'Описание'})).toHaveFocus();

        await userEvent.keyboard('{ArrowRight}');

        expect(screen.getByRole('tab', {name: 'Отзывы'})).toHaveFocus();
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Текст отзывов');
    });

    it('стрелки ходят по кругу и перескакивают выключенную', async () => {
        render(<Sample/>);

        await userEvent.tab();
        await userEvent.keyboard('{ArrowRight}{ArrowRight}');

        /* Третья выключена, поэтому после второй сразу первая. */
        expect(screen.getByRole('tab', {name: 'Описание'})).toHaveFocus();

        await userEvent.keyboard('{ArrowLeft}');
        expect(screen.getByRole('tab', {name: 'Отзывы'})).toHaveFocus();
    });

    it('Home и End ведут к краям', async () => {
        render(<Sample/>);

        await userEvent.tab();
        await userEvent.keyboard('{End}');
        expect(screen.getByRole('tab', {name: 'Отзывы'})).toHaveFocus();

        await userEvent.keyboard('{Home}');
        expect(screen.getByRole('tab', {name: 'Описание'})).toHaveFocus();
    });

    it('вертикальные слушают вверх и вниз, а не влево и вправо', async () => {
        render(<Sample orientation="vertical"/>);

        await userEvent.tab();
        await userEvent.keyboard('{ArrowRight}');
        expect(screen.getByRole('tab', {name: 'Описание'})).toHaveFocus();

        await userEvent.keyboard('{ArrowDown}');
        expect(screen.getByRole('tab', {name: 'Отзывы'})).toHaveFocus();
    });

    /*
     * Полоса — одна остановка на всю: по вкладкам ходят стрелками, а Tab
     * уводит из неё наружу. Это роверинг: открытая кнопка держит tabindex="0",
     * остальные — "-1".
     *
     * Куда именно попадёт фокус дальше, решает содержимое панели и движок
     * (см. разбор в Tabs.tsx), и в jsdom этого не видно: прокрутки он
     * не считает. Поэтому здесь проверяется то, за что отвечают вкладки, —
     * что Tab не пошёл по остальным кнопкам.
     */
    it('полоса — одна остановка: Tab уводит из неё наружу', async () => {
        render(<Sample/>);

        const tabs = screen.getAllByRole('tab');

        expect(tabs.map(node => node.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);

        await userEvent.tab();
        expect(tabs[0]).toHaveFocus();

        await userEvent.tab();
        expect(tabs.some(node => node === document.activeElement)).toBe(false);
    });
});

describe('Tabs: доступность', () => {
    it('проходит axe', async () => {
        const {container} = render(<Sample/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Sample/>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });

    it('блок снаружи Tabs падает сразу, а не рисует связи в пустоту', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => render(<Tabs.Content value="a">Текст</Tabs.Content>))
            .toThrow('Tabs.Content должен лежать внутри <Tabs>');

        error.mockRestore();
    });
});

describe('Tabs: вид PILL', () => {
    /*
     * Вид не трогает разметку: и линия, и таблетка — это tablist
     * с кнопками tab. Меняются только классы оболочки, а индикатор
     * к озвучке отношения не имеет.
     */
    function Group() {
        return (
            <Tabs defaultValue="about" variant="PILL">
                <Tabs.Buttons label="Раздел">
                    <Tabs.Button value="about">Описание</Tabs.Button>
                    <Tabs.Button value="reviews">Отзывы</Tabs.Button>
                </Tabs.Buttons>
                <Tabs.Content value="about">Текст описания</Tabs.Content>
                <Tabs.Content value="reviews">Текст отзывов</Tabs.Content>
            </Tabs>
        );
    }

    it('роли и связи те же, что у линии', () => {
        render(<Group/>);
        const tab = screen.getByRole('tab', {name: 'Описание'});

        expect(screen.getByRole('tablist', {name: 'Раздел'})).toBeInTheDocument();
        expect(tab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tab.id);
    });

    it('индикатор не попадает в дерево доступности', () => {
        const {container} = render(<Group/>);
        const pill = container.querySelector('[role="presentation"]');

        expect(pill).not.toBeNull();
        expect(pill).toHaveAttribute('aria-hidden', 'true');
        /* У tablist в детях бывают только tab, поэтому индикатор
           объявлен презентационным. */
        expect(screen.getByRole('tablist').contains(pill)).toBe(true);
    });

    it('клавиатура работает так же', async () => {
        render(<Group/>);

        await userEvent.tab();
        await userEvent.keyboard('{ArrowRight}');

        expect(screen.getByRole('tab', {name: 'Отзывы'})).toHaveFocus();
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Текст отзывов');
    });

    it('проходит axe', async () => {
        const {container} = render(<Group/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });
});

describe('Tabs: смена панели', () => {
    /*
     * Сама анимация — переход CSS, которого в jsdom нет: ни
     * content-visibility, ни allow-discrete, ни translate здесь не считаются.
     * Это браузерный замер (Chromium 141: уходящая панель видима все 180 мс
     * и гаснет на последнем кадре, приходящая едет 16px → 0, высота набора
     * меняется сразу, без промежуточного максимума из двух панелей).
     *
     * Здесь проверяется ровно то, чем компонент управляет сам: подсказки
     * в разметке, по которым работают правила CSS.
     */

    /** Панели в порядке разметки, включая закрытые. */
    function panels(container: HTMLElement) {
        return Array.from(container.querySelectorAll('[role="tabpanel"]'));
    }

    it('по умолчанию панель проявляется', () => {
        const {container} = render(<Sample/>);

        expect(container.firstElementChild).toHaveAttribute('data-motion', 'fade');
    });

    it('вариант уходит на корень: дальше всё решает CSS', () => {
        const {container} = render(<Sample motion="slide"/>);

        expect(container.firstElementChild).toHaveAttribute('data-motion', 'slide');
    });

    it('у сдвига закрытая панель знает свою сторону', () => {
        const {container} = render(<Sample motion="slide"/>);
        const [about, reviews, delivery] = panels(container);

        /* Открытая не двигается, поэтому стороны у неё нет вовсе. */
        expect(about).not.toHaveAttribute('data-side');
        expect(reviews).toHaveAttribute('data-side', 'after');
        expect(delivery).toHaveAttribute('data-side', 'after');
    });

    it('сторона пересчитывается при переключении', async () => {
        const {container} = render(<Sample motion="slide"/>);
        await userEvent.click(screen.getByRole('tab', {name: 'Отзывы'}));

        const [about, reviews, delivery] = panels(container);

        expect(about).toHaveAttribute('data-side', 'before');
        expect(reviews).not.toHaveAttribute('data-side');
        expect(delivery).toHaveAttribute('data-side', 'after');
    });

    it('сторона считается по разметке, а не по порядку панелей', () => {
        /* Панели нарочно лежат не в том порядке, что кнопки. */
        const {container} = render(
            <Tabs defaultValue="b" motion="slide">
                <Tabs.Buttons label="Раздел">
                    <Tabs.Button value="a">Первая</Tabs.Button>
                    <Tabs.Button value="b">Вторая</Tabs.Button>
                </Tabs.Buttons>

                <Tabs.Content value="b">Вторая панель</Tabs.Content>
                <Tabs.Content value="a">Первая панель</Tabs.Content>
            </Tabs>,
        );
        const closed = container.querySelector('[id$="-a-panel"]');

        expect(closed).toHaveAttribute('data-side', 'before');
    });

    it('без сдвига сторона не ставится: она нужна только ему', () => {
        const {container} = render(<Sample motion="fade"/>);

        expect(panels(container).some(panel => panel.hasAttribute('data-side'))).toBe(false);
    });

    it('смена варианта убирает прежнюю сторону', () => {
        const {container, rerender} = render(<Sample motion="slide"/>);
        expect(panels(container)[1]).toHaveAttribute('data-side', 'after');

        rerender(<Sample motion="none"/>);
        expect(panels(container)[1]).not.toHaveAttribute('data-side');
    });

    it('анимация не трогает ни роли, ни связи', async () => {
        const {container} = render(<Sample motion="slide"/>);
        await userEvent.click(screen.getByRole('tab', {name: 'Отзывы'}));

        const panel = screen.getByRole('tabpanel');
        const tab = screen.getByRole('tab', {name: 'Отзывы'});

        expect(tab).toHaveAttribute('aria-selected', 'true');
        expect(panel).toHaveAttribute('aria-labelledby', tab.id);

        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });
});

describe('Tabs: значения не на латинице', () => {
    /*
     * Поймано на вложенности табов в аккордеон. Старый slug выбрасывал
     * всё, что не ASCII, и «первая» с «вторая» давали один и тот же id:
     * две кнопки с одинаковым id, обе aria-controls на первую панель.
     */
    it('русские значения дают разные id и верные связи', () => {
        const {container} = render(
            <Tabs defaultValue="первая">
                <Tabs.Buttons label="Вкладки">
                    <Tabs.Button value="первая">Первая</Tabs.Button>
                    <Tabs.Button value="вторая">Вторая</Tabs.Button>
                </Tabs.Buttons>
                <Tabs.Content value="первая">Раз</Tabs.Content>
                <Tabs.Content value="вторая">Два</Tabs.Content>
            </Tabs>,
        );

        const tabs = [...container.querySelectorAll('[role="tab"]')];
        const panels = [...container.querySelectorAll('[role="tabpanel"]')];

        expect(new Set(tabs.map(node => node.id)).size).toBe(2);
        expect(new Set(panels.map(node => node.id)).size).toBe(2);

        for (const tab of tabs) {
            const panel = document.getElementById(tab.getAttribute('aria-controls')!);

            expect(panel).not.toBeNull();
            expect(panel!.getAttribute('aria-labelledby')).toBe(tab.id);
        }
    });

    it('пробелы и знаки из id уходят, буквы остаются', () => {
        const {container} = render(
            <Tabs defaultValue="Счёт №1">
                <Tabs.Buttons label="Счета">
                    <Tabs.Button value="Счёт №1">Первый</Tabs.Button>
                    <Tabs.Button value="Счёт №2">Второй</Tabs.Button>
                </Tabs.Buttons>
                <Tabs.Content value="Счёт №1">Раз</Tabs.Content>
                <Tabs.Content value="Счёт №2">Два</Tabs.Content>
            </Tabs>,
        );

        const id = [...container.querySelectorAll('[role="tab"]')].map(node => node.id);

        expect(new Set(id).size).toBe(2);
        /* IDREF не терпит пробела: он там разделяет ссылки. */
        expect(id.every(name => !name.includes(' '))).toBe(true);
        expect(id[0]).toContain('Счёт');
    });
});

describe('Tabs: панель в обходе табуляцией', () => {
    /*
     * Своего tabindex панель не ставит: условие APG («панель в обходе, только
     * когда внутри нет фокусируемого») движок выполняет сам — фокусируемыми
     * становятся прокручиваемые области, и только те, внутри которых нечего
     * фокусировать. Замеры браузера лежат в Tabs.tsx; jsdom прокрутки
     * не считает, поэтому здесь проверяется ровно разметка.
     */
    it('своего tabindex у панели нет', () => {
        render(
            <Tabs defaultValue="about">
                <Tabs.Buttons label="Раздел">
                    <Tabs.Button value="about">Описание</Tabs.Button>
                </Tabs.Buttons>
                <Tabs.Content value="about">Просто текст без ссылок</Tabs.Content>
            </Tabs>,
        );

        expect(screen.getByRole('tabpanel')).not.toHaveAttribute('tabindex');
    });

    /*
     * Замерено в Chromium 141: элемент с hidden="until-found" фокусируем сам
     * по себе — внутрь не пускает content-visibility, а до блока Tab доходит.
     * Поэтому безусловный tabindex="0" делал остановкой каждую закрытую панель.
     */
    it('закрытые панели тоже без tabindex', () => {
        const {container} = render(<Sample/>);
        const closed = [...container.querySelectorAll('[role="tabpanel"][hidden]')];

        expect(closed).toHaveLength(2);
        expect(closed.every(node => !node.hasAttribute('tabindex'))).toBe(true);
    });

    /* Там, где движок не поможет (прокручиваемая панель в Safari), решает автор. */
    it('переданный снаружи tabIndex доходит до панели', () => {
        render(
            <Tabs defaultValue="about">
                <Tabs.Buttons label="Раздел">
                    <Tabs.Button value="about">Описание</Tabs.Button>
                </Tabs.Buttons>
                <Tabs.Content value="about" tabIndex={0}>Длинный текст</Tabs.Content>
            </Tabs>,
        );

        expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
    });
});

describe('Tabs: lazy у панели', () => {
    /*
     * По умолчанию панели живут в разметке все — ради поиска по странице.
     * lazy меняет размен: панель пустая, пока её не открыли, а открытая
     * один раз больше не пустеет.
     *
     * Решение принимает сама панель: открытую вкладку Tabs ведёт сам,
     * и снаружи для этого ничего держать не нужно.
     */
    function Lazy() {
        return (
            <Tabs defaultValue="about">
                <Tabs.Buttons label="Раздел">
                    <Tabs.Button value="about">Описание</Tabs.Button>
                    <Tabs.Button value="reviews">Отзывы</Tabs.Button>
                </Tabs.Buttons>

                <Tabs.Content value="about" lazy><p>Текст описания</p></Tabs.Content>
                <Tabs.Content value="reviews" lazy><p>Текст отзывов</p></Tabs.Content>
            </Tabs>
        );
    }

    it('без lazy в разметке сразу все панели', () => {
        render(<Sample/>);

        expect(screen.getByText('Текст описания')).toBeInTheDocument();
        expect(screen.getByText('Текст отзывов')).toBeInTheDocument();
    });

    it('с lazy закрытая панель пустая, открытая — нет', () => {
        render(<Lazy/>);

        expect(screen.getByText('Текст описания')).toBeInTheDocument();
        expect(screen.queryByText('Текст отзывов')).not.toBeInTheDocument();
    });

    it('открытая один раз панель больше не пустеет', async () => {
        const user = userEvent.setup();

        render(<Lazy/>);

        await user.click(screen.getByRole('tab', {name: 'Отзывы'}));
        expect(screen.getByText('Текст отзывов')).toBeInTheDocument();

        await user.click(screen.getByRole('tab', {name: 'Описание'}));
        /* Вернулись на первую, а вторая осталась в разметке — закрытой. */
        expect(screen.getByText('Текст отзывов')).toBeInTheDocument();
    });

    /* Содержимое приходит тем же кадром, иначе панель мигнула бы пустой. */
    it('содержимое появляется тем же кадром, что и открытие', () => {
        const {container, rerender} = render(
            <Tabs value="about" onChange={() => undefined}>
                <Tabs.Buttons label="Раздел">
                    <Tabs.Button value="about">Описание</Tabs.Button>
                    <Tabs.Button value="reviews">Отзывы</Tabs.Button>
                </Tabs.Buttons>
                <Tabs.Content value="reviews" lazy><p>Текст отзывов</p></Tabs.Content>
            </Tabs>,
        );

        expect(container.querySelector('p')).toBeNull();

        rerender(
            <Tabs value="reviews" onChange={() => undefined}>
                <Tabs.Buttons label="Раздел">
                    <Tabs.Button value="about">Описание</Tabs.Button>
                    <Tabs.Button value="reviews">Отзывы</Tabs.Button>
                </Tabs.Buttons>
                <Tabs.Content value="reviews" lazy><p>Текст отзывов</p></Tabs.Content>
            </Tabs>,
        );

        expect(container.querySelector('p')).not.toBeNull();
    });
});
