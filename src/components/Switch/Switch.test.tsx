import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {createRef, useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Switch} from './Switch';
import styles from './Switch.module.css';

/*
 * Проверяется разметка, связь подписи с полем, переключение с клавиатуры
 * и мышью, роль свитча и поведение в форме.
 *
 * Оформления здесь нет: положение бегунка держится на transition
 * inset-inline-start, который jsdom не считает. Вид меряется в браузере.
 */

describe('Switch', () => {
    it('рендерит настоящий input type="checkbox"', () => {
        render(<Switch>Уведомления</Switch>);
        const input = screen.getByRole('switch');
        expect(input.tagName).toBe('INPUT');
        expect(input).toHaveAttribute('type', 'checkbox');
    });

    it('роль switch, а не checkbox', () => {
        render(<Switch>Уведомления</Switch>);
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('подпись становится именем поля без id и aria', () => {
        render(<Switch>Уведомления</Switch>);
        // имя взялось из вложенности в label, а не из aria-label
        const input = screen.getByRole('switch', {name: 'Уведомления'});
        expect(input).not.toHaveAttribute('aria-label');
        expect(input).not.toHaveAttribute('id');
    });

    it('разметка внутри подписи сохраняется', () => {
        render(
            <Switch>
                <strong>Тёмная</strong>
                <img src="/a.png" alt="значок"/>
            </Switch>,
        );
        expect(screen.getByText('Тёмная').tagName).toBe('STRONG');
        expect(screen.getByAltText('значок')).toBeInTheDocument();
    });

    it('работает без подписи вовсе', () => {
        render(<Switch aria-label="Скрыть панель"/>);
        expect(screen.getByRole('switch', {name: 'Скрыть панель'})).toBeInTheDocument();
    });

    /* ---------------------------------------------------------------- */
    /*  Переключение                                                    */
    /* ---------------------------------------------------------------- */

    it('клик по подписи переключает поле', async () => {
        const user = userEvent.setup();
        render(<Switch>Уведомления</Switch>);
        const input = screen.getByRole('switch');

        await user.click(screen.getByText('Уведомления'));
        expect(input).toBeChecked();
    });

    it('переключается пробелом с клавиатуры', async () => {
        const user = userEvent.setup();
        render(<Switch>Уведомления</Switch>);
        const input = screen.getByRole('switch');

        await user.tab();
        expect(input).toHaveFocus();

        await user.keyboard(' ');
        expect(input).toBeChecked();
    });

    it('повторный клик выключает обратно', async () => {
        const user = userEvent.setup();
        render(<Switch defaultChecked>Уведомления</Switch>);
        const input = screen.getByRole('switch');
        expect(input).toBeChecked();

        await user.click(input);
        expect(input).not.toBeChecked();
    });

    it('управляемый режим: значение приходит извне', async () => {
        const user = userEvent.setup();

        function Controlled() {
            const [on, setOn] = useState(false);

            return (
                <>
                    <Switch checked={on} onChange={event => setOn(event.target.checked)}>
                        Тёмная тема
                    </Switch>
                    <output>{on ? 'вкл' : 'выкл'}</output>
                </>
            );
        }

        render(<Controlled/>);
        await user.click(screen.getByRole('switch'));
        expect(screen.getByRole('status')).toHaveTextContent('вкл');
    });

    it('disabled не переключается', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Switch disabled onChange={onChange}>Уведомления</Switch>);

        await user.click(screen.getByText('Уведомления'));
        expect(screen.getByRole('switch')).not.toBeChecked();
        expect(onChange).not.toHaveBeenCalled();
    });

    /* ---------------------------------------------------------------- */
    /*  Форма                                                           */
    /* ---------------------------------------------------------------- */

    it('включённый уходит в данные формы, выключенный — нет', async () => {
        const user = userEvent.setup();
        render(
            <form>
                <Switch name="notify" value="yes">Уведомления</Switch>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;

        expect(new FormData(form).get('notify')).toBeNull();

        await user.click(screen.getByRole('switch'));
        expect(new FormData(form).get('notify')).toBe('yes');
    });

    it('defaultChecked включает поле заранее', () => {
        render(<Switch name="notify" value="yes" defaultChecked>Уведомления</Switch>);
        expect(screen.getByRole('switch')).toBeChecked();
    });

    /* ---------------------------------------------------------------- */
    /*  Пропсы и классы                                                 */
    /* ---------------------------------------------------------------- */

    it('ref указывает на поле, а не на обёртку', () => {
        const ref = createRef<HTMLInputElement>();
        render(<Switch ref={ref}>Уведомления</Switch>);
        expect(ref.current).toBe(screen.getByRole('switch'));
    });

    it('className и style идут на обёртку', () => {
        render(<Switch className="my" style={{opacity: 0.5}}>Уведомления</Switch>);
        const label = screen.getByText('Уведомления').closest('label') as HTMLLabelElement;
        expect(label).toHaveClass(styles.switch, 'my');
        expect(label.style.opacity).toBe('0.5');
    });

    it('остальные пропсы идут на поле', () => {
        render(<Switch name="notify" value="yes" required data-kind="setting">Уведомления</Switch>);
        const input = screen.getByRole('switch');
        expect(input).toHaveAttribute('name', 'notify');
        expect(input).toHaveAttribute('value', 'yes');
        expect(input).toBeRequired();
        expect(input).toHaveAttribute('data-kind', 'setting');
    });

    /* ---------------------------------------------------------------- */
    /*  Доступность                                                     */
    /* ---------------------------------------------------------------- */

    it('проходит axe включённым и выключенным', async () => {
        const {container} = render(
            <>
                <Switch name="a" value="1">Выключен</Switch>
                <Switch name="b" value="2" defaultChecked>Включён</Switch>
                <Switch disabled>Недоступен</Switch>
            </>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Switch defaultChecked name="a" value="1">Текст</Switch>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
