import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {createRef, useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Checkbox} from './Checkbox';
import styles from '../Control/Control.module.css';

/*
 * Проверяется разметка, связь подписи с полем, переключение с клавиатуры
 * и мышью, промежуточное состояние и поведение в форме.
 *
 * Оформления здесь нет: подсветка чипа держится на :has() и color-mix,
 * которых jsdom не считает. Вид меряется в браузере.
 */

describe('Checkbox', () => {
    it('рендерит настоящий input type="checkbox"', () => {
        render(<Checkbox>Показывать скрытые</Checkbox>);
        const input = screen.getByRole('checkbox');
        expect(input.tagName).toBe('INPUT');
        expect(input).toHaveAttribute('type', 'checkbox');
    });

    it('подпись становится именем поля без id и aria', () => {
        render(<Checkbox>Показывать скрытые</Checkbox>);
        // имя взялось из вложенности в label, а не из aria-label
        const input = screen.getByRole('checkbox', {name: 'Показывать скрытые'});
        expect(input).not.toHaveAttribute('aria-label');
        expect(input).not.toHaveAttribute('id');
    });

    it('разметка внутри подписи сохраняется', () => {
        render(
            <Checkbox>
                <strong>Про</strong>
                <img src="/a.png" alt="значок"/>
            </Checkbox>,
        );
        expect(screen.getByText('Про').tagName).toBe('STRONG');
        expect(screen.getByAltText('значок')).toBeInTheDocument();
    });

    it('работает без подписи вовсе', () => {
        render(<Checkbox aria-label="Выбрать строку"/>);
        expect(screen.getByRole('checkbox', {name: 'Выбрать строку'})).toBeInTheDocument();
    });

    /* ---------------------------------------------------------------- */
    /*  Переключение                                                    */
    /* ---------------------------------------------------------------- */

    it('клик по подписи переключает поле', async () => {
        const user = userEvent.setup();
        render(<Checkbox>Согласен</Checkbox>);
        const input = screen.getByRole('checkbox');

        await user.click(screen.getByText('Согласен'));
        expect(input).toBeChecked();
    });

    it('переключается пробелом с клавиатуры', async () => {
        const user = userEvent.setup();
        render(<Checkbox>Согласен</Checkbox>);
        const input = screen.getByRole('checkbox');

        await user.tab();
        expect(input).toHaveFocus();

        await user.keyboard(' ');
        expect(input).toBeChecked();
    });

    it('управляемый режим: значение приходит извне', async () => {
        const user = userEvent.setup();

        function Controlled() {
            const [on, setOn] = useState(false);

            return (
                <>
                    <Checkbox checked={on} onChange={event => setOn(event.target.checked)}>
                        Согласен
                    </Checkbox>
                    <output>{on ? 'да' : 'нет'}</output>
                </>
            );
        }

        render(<Controlled/>);
        await user.click(screen.getByRole('checkbox'));
        expect(screen.getByRole('status')).toHaveTextContent('да');
    });

    it('disabled не переключается', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Checkbox disabled onChange={onChange}>Согласен</Checkbox>);

        await user.click(screen.getByText('Согласен'));
        expect(screen.getByRole('checkbox')).not.toBeChecked();
        expect(onChange).not.toHaveBeenCalled();
    });

    /* ---------------------------------------------------------------- */
    /*  Промежуточное состояние                                         */
    /* ---------------------------------------------------------------- */

    it('indeterminate ставится свойством DOM', () => {
        render(<Checkbox indeterminate>Выбрать всё</Checkbox>);
        const input = screen.getByRole('checkbox') as HTMLInputElement;
        expect(input.indeterminate).toBe(true);
        expect(input).toBePartiallyChecked();
    });

    it('indeterminate снимается, когда проп стал false', () => {
        const {rerender} = render(<Checkbox indeterminate>Выбрать всё</Checkbox>);
        const input = screen.getByRole('checkbox') as HTMLInputElement;
        expect(input.indeterminate).toBe(true);

        rerender(<Checkbox indeterminate={false}>Выбрать всё</Checkbox>);
        expect(input.indeterminate).toBe(false);
    });

    it('по умолчанию промежуточного состояния нет', () => {
        render(<Checkbox>Выбрать всё</Checkbox>);
        expect((screen.getByRole('checkbox') as HTMLInputElement).indeterminate).toBe(false);
    });

    /* ---------------------------------------------------------------- */
    /*  Форма                                                           */
    /* ---------------------------------------------------------------- */

    it('отмеченный уходит в данные формы, неотмеченный — нет', async () => {
        const user = userEvent.setup();
        render(
            <form>
                <Checkbox name="terms" value="yes">Согласен</Checkbox>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;

        expect(new FormData(form).get('terms')).toBeNull();

        await user.click(screen.getByRole('checkbox'));
        expect(new FormData(form).get('terms')).toBe('yes');
    });

    /* ---------------------------------------------------------------- */
    /*  Пропсы и классы                                                 */
    /* ---------------------------------------------------------------- */

    it('ref указывает на поле, а не на обёртку', () => {
        const ref = createRef<HTMLInputElement>();
        render(<Checkbox ref={ref}>Согласен</Checkbox>);
        expect(ref.current).toBe(screen.getByRole('checkbox'));
    });

    it('ref работает вместе с indeterminate', () => {
        const ref = createRef<HTMLInputElement>();
        render(<Checkbox ref={ref} indeterminate>Выбрать всё</Checkbox>);
        // свой ref компонента не съел чужой
        expect(ref.current).toBe(screen.getByRole('checkbox'));
        expect(ref.current?.indeterminate).toBe(true);
    });

    it('className и style идут на обёртку', () => {
        render(<Checkbox className="my" style={{opacity: 0.5}}>Согласен</Checkbox>);
        const label = screen.getByText('Согласен').closest('label') as HTMLLabelElement;
        expect(label).toHaveClass(styles.control, styles.checkbox, 'my');
        expect(label.style.opacity).toBe('0.5');
    });

    it('variant="CHIP" добавляет класс чипа, DEFAULT — нет', () => {
        const {rerender} = render(<Checkbox variant="CHIP">Про</Checkbox>);
        expect(screen.getByText('Про').closest('label')).toHaveClass(styles.chip);

        rerender(<Checkbox variant="DEFAULT">Про</Checkbox>);
        expect(screen.getByText('Про').closest('label')).not.toHaveClass(styles.chip);
    });

    it('остальные пропсы идут на поле', () => {
        render(<Checkbox name="terms" value="yes" required data-kind="legal">Согласен</Checkbox>);
        const input = screen.getByRole('checkbox');
        expect(input).toHaveAttribute('name', 'terms');
        expect(input).toHaveAttribute('value', 'yes');
        expect(input).toBeRequired();
        expect(input).toHaveAttribute('data-kind', 'legal');
    });

    /* ---------------------------------------------------------------- */
    /*  Доступность                                                     */
    /* ---------------------------------------------------------------- */

    it('проходит axe в обоих вариантах', async () => {
        const {container} = render(
            <>
                <Checkbox name="a" value="1">Обычный</Checkbox>
                <Checkbox name="b" value="2" variant="CHIP">Чип</Checkbox>
                <Checkbox name="c" value="3" indeterminate>Промежуточный</Checkbox>
            </>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Checkbox variant="CHIP" indeterminate name="a" value="1">Текст</Checkbox>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
