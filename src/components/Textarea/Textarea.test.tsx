import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Textarea} from './Textarea';

/*
 * Разметка, форма и значение. Авторост здесь не проверить: field-sizing
 * считает движок, которого в jsdom нет, — это браузерный замер.
 */

describe('Textarea', () => {
    it('подпись связана с полем', () => {
        render(<Textarea label="Комментарий"/>);
        expect(screen.getByRole('textbox', {name: 'Комментарий'})).toBeInTheDocument();
    });

    it('клик по коробке ставит фокус в поле', async () => {
        render(<Textarea label="Комментарий"/>);
        const area = screen.getByRole('textbox');

        await userEvent.click(area.closest('label') as HTMLElement);
        expect(area).toHaveFocus();
    });

    it('пустое поле не помечено заполненным', () => {
        render(<Textarea label="Комментарий"/>);
        expect(screen.getByRole('textbox').closest('[data-filled]')).toBeNull();
    });

    it('с текстом поле помечено заполненным', () => {
        render(<Textarea label="Комментарий" defaultValue="Есть что сказать"/>);
        expect(screen.getByRole('textbox').closest('[data-filled]')).not.toBeNull();
    });

    it('переносы строк сохраняются', async () => {
        render(<Textarea label="Адрес"/>);
        const area = screen.getByRole('textbox') as HTMLTextAreaElement;

        await userEvent.type(area, 'Первая{Enter}Вторая');
        expect(area.value).toBe('Первая\nВторая');
    });

    it('значение уходит в форму по name', async () => {
        render(<form><Textarea label="Комментарий" name="comment"/></form>);
        const form = document.querySelector('form') as HTMLFormElement;

        await userEvent.type(screen.getByRole('textbox'), 'Спасибо');
        expect(new FormData(form).get('comment')).toBe('Спасибо');
    });

    it('onChange отдаёт строку, а не событие', async () => {
        const onChange = vi.fn();

        render(<Textarea label="Комментарий" onChange={onChange}/>);
        await userEvent.type(screen.getByRole('textbox'), 'да');
        expect(onChange).toHaveBeenLastCalledWith('да');
    });

    it('управляемое поле слушается владельца', async () => {
        function Controlled() {
            const [value, setValue] = useState('');

            return <>
                <Textarea label="Комментарий" value={value} onChange={setValue}/>
                <output>{value}</output>
            </>;
        }

        render(<Controlled/>);
        await userEvent.type(screen.getByRole('textbox'), 'ок');
        expect(screen.getByRole('status')).toHaveTextContent('ок');
    });

    it('авторост включён по умолчанию и выключается пропом', () => {
        const {rerender} = render(<Textarea label="Комментарий"/>);
        expect(screen.getByRole('textbox')).toHaveAttribute('data-grow');

        rerender(<Textarea label="Комментарий" autoGrow={false}/>);
        expect(screen.getByRole('textbox')).not.toHaveAttribute('data-grow');
    });

    it('нативные пропсы доходят до поля', () => {
        render(<Textarea label="Комментарий" rows={5} maxLength={200} required readOnly/>);
        const area = screen.getByRole('textbox');

        expect(area).toHaveAttribute('rows', '5');
        expect(area).toHaveAttribute('maxlength', '200');
        expect(area).toBeRequired();
        expect(area).toHaveAttribute('readonly');
    });

    it('проходит axe', async () => {
        const {container} = render(<Textarea label="Комментарий" name="comment" required/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Textarea label="Комментарий" name="comment" defaultValue="Текст"/>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});

describe('Textarea: ошибка', () => {
    it('своя ошибка видна и читается описанием поля', () => {
        render(<Textarea label="Комментарий" error="Слишком коротко"/>);
        const input = screen.getByRole('textbox', {name: 'Комментарий'});

        expect(input).toHaveAccessibleDescription('Слишком коротко');
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('текст ошибки не попадает в имя поля', () => {
        /* Коробка это <label>: всё её содержимое идёт в имя, поэтому
           сообщение лежит снаружи. */
        render(<Textarea label="Комментарий" error="Слишком коротко"/>);
        expect(screen.getByRole('textbox').getAttribute('aria-label')).toBeNull();
        expect(screen.getByRole('textbox', {name: 'Комментарий'})).toBeInTheDocument();
    });

    it('браузерное сообщение появляется на попытке отправить', async () => {
        render(<form><Textarea label="Комментарий" name="text" required/></form>);
        const input = screen.getByRole('textbox') as HTMLTextAreaElement;
        const form = document.querySelector('form') as HTMLFormElement;

        await act(async () => form.requestSubmit());

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription(input.validationMessage);
    });

    it('сообщение уходит, как только поле поправили', async () => {
        render(<form><Textarea label="Комментарий" name="text" required/></form>);
        const input = screen.getByRole('textbox');
        const form = document.querySelector('form') as HTMLFormElement;

        await act(async () => form.requestSubmit());
        expect(input).toHaveAttribute('aria-invalid', 'true');

        await userEvent.type(input, 'Есть');
        expect(input).not.toHaveAttribute('aria-invalid');
    });

    it('поле с ошибкой проходит axe', async () => {
        const {container} = render(<Textarea label="Комментарий" name="text" error="Коротко"/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });
});
