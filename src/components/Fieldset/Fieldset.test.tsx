import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {describe, expect, it, vi} from 'vitest';
import {Button} from '../Button/Button';
import {Checkbox} from '../Checkbox/Checkbox';
import {Radio} from '../Radio/Radio';
import {Fieldset} from './Fieldset';
import styles from './Fieldset.module.css';

/*
 * Проверяется семантика: имя группы, порядок легенды, выключение всего
 * содержимого разом и исключение для легенды.
 *
 * Раскладки здесь нет — legend выносится из потока движком, которого
 * в jsdom не существует. Отступы и направление меряются в браузере.
 */

describe('Fieldset', () => {
    it('рендерит fieldset с легендой', () => {
        render(<Fieldset legend="Тариф"><Radio name="p" value="a">Раз</Radio></Fieldset>);
        const group = screen.getByRole('group', {name: 'Тариф'});
        expect(group.tagName).toBe('FIELDSET');
    });

    it('легенда — первый ребёнок, иначе она не легенда', () => {
        render(
            <Fieldset legend="Тариф">
                <Radio name="p" value="a">Раз</Radio>
            </Fieldset>,
        );
        const group = screen.getByRole('group');
        expect(group.firstElementChild?.tagName).toBe('LEGEND');
    });

    it('легенда может быть разметкой', () => {
        render(
            <Fieldset legend={<><span>Тариф</span> <small>(можно сменить)</small></>}>
                <Radio name="p" value="a">Раз</Radio>
            </Fieldset>,
        );
        expect(screen.getByRole('group', {name: 'Тариф (можно сменить)'})).toBeInTheDocument();
    });

    /* ---------------------------------------------------------------- */
    /*  Скрытая легенда                                                 */
    /* ---------------------------------------------------------------- */

    it('hideLegend оставляет имя группы', () => {
        render(
            <Fieldset legend="Способ оплаты" hideLegend>
                <Radio name="pay" value="card">Картой</Radio>
            </Fieldset>,
        );
        // имя на месте, значит легенда не выброшена из дерева доступности
        expect(screen.getByRole('group', {name: 'Способ оплаты'})).toBeInTheDocument();
    });

    it('hideLegend меняет класс, а не прячет через display', () => {
        render(<Fieldset legend="Оплата" hideLegend><Button>Кнопка</Button></Fieldset>);
        const legend = screen.getByText('Оплата');
        expect(legend).toHaveClass(styles.hiddenLegend);
        expect(legend).not.toHaveClass(styles.legend);
    });

    /* ---------------------------------------------------------------- */
    /*  Выключение группы                                               */
    /* ---------------------------------------------------------------- */

    it('disabled гасит все поля внутри', () => {
        render(
            <Fieldset legend="Доставка" disabled>
                <Radio name="ship" value="fast">Быстрая</Radio>
                <Checkbox name="gift">Подарочная упаковка</Checkbox>
                <Button>Кнопка</Button>
            </Fieldset>,
        );
        expect(screen.getByRole('radio')).toBeDisabled();
        expect(screen.getByRole('checkbox')).toBeDisabled();
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('выключает предок, а не атрибут поля', () => {
        render(
            <Fieldset legend="Доставка" disabled>
                <Checkbox name="gift">Упаковка</Checkbox>
            </Fieldset>,
        );
        const input = screen.getByRole('checkbox') as HTMLInputElement;
        // собственное свойство не менялось — выключает fieldset
        expect(input.getAttribute('disabled')).toBeNull();
        expect(input.matches(':disabled')).toBe(true);
    });

    it('выключенная группа не реагирует на клик', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <Fieldset legend="Доставка" disabled>
                <Checkbox name="gift" onChange={onChange}>Упаковка</Checkbox>
            </Fieldset>,
        );

        await user.click(screen.getByText('Упаковка'));
        expect(screen.getByRole('checkbox')).not.toBeChecked();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('поле внутри легенды остаётся живым при disabled', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <Fieldset
                disabled
                legend={<Checkbox name="own" onChange={onChange}>Своя доставка</Checkbox>}
            >
                <Checkbox name="gift">Упаковка</Checkbox>
            </Fieldset>,
        );
        const [inLegend, inside] = screen.getAllByRole('checkbox');

        expect(inside).toBeDisabled();
        expect(inLegend).not.toBeDisabled();

        await user.click(screen.getByText('Своя доставка'));
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('без disabled ничего не гасит', () => {
        render(
            <Fieldset legend="Доставка">
                <Checkbox name="gift">Упаковка</Checkbox>
            </Fieldset>,
        );
        expect(screen.getByRole('checkbox')).not.toBeDisabled();
    });

    /* ---------------------------------------------------------------- */
    /*  Роль и пропсы                                                   */
    /* ---------------------------------------------------------------- */

    it('role="radiogroup" пробрасывается и не ломает вложенные роли', () => {
        render(
            <Fieldset legend="Тариф" role="radiogroup">
                <Radio name="plan" value="free">Бесплатный</Radio>
                <Radio name="plan" value="pro">Профессиональный</Radio>
            </Fieldset>,
        );
        expect(screen.getByRole('radiogroup', {name: 'Тариф'})).toBeInTheDocument();
        expect(screen.getAllByRole('radio')).toHaveLength(2);
    });

    it.each([
        ['block', 'block'],
        ['inline', 'inline'],
    ] as const)('orientation="%s" ставит свой класс', (orientation, expected) => {
        render(
            <Fieldset legend="Тариф" orientation={orientation}>
                <Radio name="p" value="a">Раз</Radio>
            </Fieldset>,
        );
        expect(screen.getByRole('group')).toHaveClass(styles[expected]);
    });

    it('по умолчанию колонка', () => {
        render(<Fieldset legend="Тариф"><Radio name="p" value="a">Раз</Radio></Fieldset>);
        expect(screen.getByRole('group')).toHaveClass(styles.block);
    });

    it('добавляет свой класс, а не заменяет базовый', () => {
        render(<Fieldset legend="Тариф" className="my"><Button>Кнопка</Button></Fieldset>);
        expect(screen.getByRole('group')).toHaveClass(styles.fieldset, styles.block, 'my');
    });

    it('остальные пропсы идут на fieldset', () => {
        render(
            <Fieldset legend="Тариф" name="plan" data-kind="tariff">
                <Button>Кнопка</Button>
            </Fieldset>,
        );
        const group = screen.getByRole('group');
        expect(group).toHaveAttribute('name', 'plan');
        expect(group).toHaveAttribute('data-kind', 'tariff');
    });

    /* ---------------------------------------------------------------- */
    /*  Доступность                                                     */
    /* ---------------------------------------------------------------- */

    it('проходит axe', async () => {
        const {container} = render(
            <>
                <Fieldset legend="Тариф" role="radiogroup">
                    <Radio name="plan" value="free">Бесплатный</Radio>
                    <Radio name="plan" value="pro">Профессиональный</Radio>
                </Fieldset>
                <Fieldset legend="Оплата" hideLegend orientation="inline">
                    <Button>Картой</Button>
                    <Button>Наличными</Button>
                </Fieldset>
            </>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <Fieldset legend="Тариф" hideLegend orientation="inline" disabled>
                <Radio name="plan" value="free">Бесплатный</Radio>
            </Fieldset>,
        );
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
