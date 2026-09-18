import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {createRef} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Radio} from './Radio';
import styles from '../Control/Control.module.css';

/*
 * Проверяется разметка, связь подписи с полем, группировка по name
 * и поведение в форме.
 *
 * Оформления здесь нет: подсветка чипа держится на :has() и color-mix,
 * которых jsdom не считает. Вид меряется в браузере.
 *
 * Стрелок внутри группы тут тоже нет — это встроенное поведение браузера,
 * и jsdom его не реализует. Оно проверено в Chromium.
 */

function Group() {
    return (
        <fieldset>
            <legend>Тариф</legend>
            <Radio name="plan" value="free">Бесплатный</Radio>
            <Radio name="plan" value="pro">Профессиональный</Radio>
        </fieldset>
    );
}

describe('Radio', () => {
    it('рендерит настоящий input type="radio"', () => {
        render(<Radio name="plan" value="free">Бесплатный</Radio>);
        const input = screen.getByRole('radio');
        expect(input.tagName).toBe('INPUT');
        expect(input).toHaveAttribute('type', 'radio');
    });

    it('подпись становится именем поля без id и aria', () => {
        render(<Radio name="plan" value="free">Бесплатный</Radio>);
        const input = screen.getByRole('radio', {name: 'Бесплатный'});
        expect(input).not.toHaveAttribute('aria-label');
        expect(input).not.toHaveAttribute('id');
    });

    it('разметка внутри подписи сохраняется', () => {
        render(
            <Radio name="plan" value="pro">
                <strong>Про</strong>
                <img src="/a.png" alt="значок"/>
            </Radio>,
        );
        expect(screen.getByText('Про').tagName).toBe('STRONG');
        expect(screen.getByAltText('значок')).toBeInTheDocument();
    });

    /* ---------------------------------------------------------------- */
    /*  Группа                                                          */
    /* ---------------------------------------------------------------- */

    it('общее name гасит соседа при выборе', async () => {
        const user = userEvent.setup();
        render(<Group/>);
        const [free, pro] = screen.getAllByRole('radio');

        await user.click(screen.getByText('Бесплатный'));
        expect(free).toBeChecked();

        await user.click(screen.getByText('Профессиональный'));
        expect(pro).toBeChecked();
        expect(free).not.toBeChecked();
    });

    it('выбор нельзя снять повторным кликом', async () => {
        const user = userEvent.setup();
        render(<Group/>);

        await user.click(screen.getByText('Бесплатный'));
        await user.click(screen.getByText('Бесплатный'));
        expect(screen.getAllByRole('radio')[0]).toBeChecked();
    });

    it('fieldset даёт группе имя', () => {
        render(<Group/>);
        expect(screen.getByRole('group', {name: 'Тариф'})).toBeInTheDocument();
    });

    it('разные name — разные группы', async () => {
        const user = userEvent.setup();
        render(
            <>
                <Radio name="plan" value="free">Тариф</Radio>
                <Radio name="pay" value="card">Оплата</Radio>
            </>,
        );
        const [plan, pay] = screen.getAllByRole('radio');

        await user.click(screen.getByText('Тариф'));
        await user.click(screen.getByText('Оплата'));
        // выбор в одной группе не гасит другую
        expect(plan).toBeChecked();
        expect(pay).toBeChecked();
    });

    it('disabled не выбирается', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Radio name="plan" value="free" disabled onChange={onChange}>Бесплатный</Radio>);

        await user.click(screen.getByText('Бесплатный'));
        expect(screen.getByRole('radio')).not.toBeChecked();
        expect(onChange).not.toHaveBeenCalled();
    });

    /* ---------------------------------------------------------------- */
    /*  Форма                                                           */
    /* ---------------------------------------------------------------- */

    it('в данные формы уходит value выбранного', async () => {
        const user = userEvent.setup();
        render(<form><Group/></form>);
        const form = document.querySelector('form') as HTMLFormElement;

        expect(new FormData(form).get('plan')).toBeNull();

        await user.click(screen.getByText('Профессиональный'));
        expect(new FormData(form).get('plan')).toBe('pro');
    });

    it('defaultChecked выбирает вариант заранее', () => {
        render(
            <>
                <Radio name="plan" value="free">Бесплатный</Radio>
                <Radio name="plan" value="pro" defaultChecked>Профессиональный</Radio>
            </>,
        );
        expect(screen.getByRole('radio', {name: 'Профессиональный'})).toBeChecked();
    });

    /* ---------------------------------------------------------------- */
    /*  Пропсы и классы                                                 */
    /* ---------------------------------------------------------------- */

    it('ref указывает на поле, а не на обёртку', () => {
        const ref = createRef<HTMLInputElement>();
        render(<Radio ref={ref} name="plan" value="free">Бесплатный</Radio>);
        expect(ref.current).toBe(screen.getByRole('radio'));
    });

    it('className и style идут на обёртку', () => {
        render(
            <Radio name="plan" value="free" className="my" style={{opacity: 0.5}}>
                Бесплатный
            </Radio>,
        );
        const label = screen.getByText('Бесплатный').closest('label') as HTMLLabelElement;
        expect(label).toHaveClass(styles.control, styles.radio, 'my');
        expect(label.style.opacity).toBe('0.5');
    });

    it('variant="CHIP" добавляет класс чипа, DEFAULT — нет', () => {
        const {rerender} = render(<Radio name="p" value="1" variant="CHIP">Про</Radio>);
        expect(screen.getByText('Про').closest('label')).toHaveClass(styles.chip);

        rerender(<Radio name="p" value="1" variant="DEFAULT">Про</Radio>);
        expect(screen.getByText('Про').closest('label')).not.toHaveClass(styles.chip);
    });

    /*
     * Не косметика: правило подсветки промежуточного состояния ограничено
     * классом флажка именно потому, что :indeterminate матчит ещё и каждый
     * переключатель из группы, где ничего не выбрано. Появится этот класс
     * на переключателе — пустая группа снова будет выглядеть выбранной
     * целиком.
     */
    it('не носит класс флажка', () => {
        render(<Radio name="p" value="1">Про</Radio>);
        expect(screen.getByText('Про').closest('label')).not.toHaveClass(styles.checkbox);
    });

    it('остальные пропсы идут на поле', () => {
        render(<Radio name="plan" value="pro" required data-kind="tariff">Про</Radio>);
        const input = screen.getByRole('radio');
        expect(input).toHaveAttribute('name', 'plan');
        expect(input).toHaveAttribute('value', 'pro');
        expect(input).toBeRequired();
        expect(input).toHaveAttribute('data-kind', 'tariff');
    });

    /* ---------------------------------------------------------------- */
    /*  Доступность                                                     */
    /* ---------------------------------------------------------------- */

    it('проходит axe в обоих вариантах', async () => {
        const {container} = render(
            <fieldset>
                <legend>Тариф</legend>
                <Radio name="plan" value="free">Бесплатный</Radio>
                <Radio name="plan" value="pro" variant="CHIP">Профессиональный</Radio>
            </fieldset>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Radio variant="CHIP" name="plan" value="pro">Текст</Radio>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
