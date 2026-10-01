import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {useState} from 'react';
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

    it('после кнопок Tab ведёт в панель, а не по остальным вкладкам', async () => {
        render(<Sample/>);

        await userEvent.tab();
        await userEvent.tab();

        expect(screen.getByRole('tabpanel')).toHaveFocus();
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
