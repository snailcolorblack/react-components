import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {Form} from './Form';
import {useForm} from './Form.context.ts';

/*
 * Сбор значений, проверка, отправка и фокус. Чего здесь нет: кнопки
 * снаружи формы — её связь с формой через атрибут form проверена
 * замером в Chromium 141 (щелчок и Enter одинаково отправляют форму
 * шага), а jsdom эту связь поддерживает не полностью.
 */

describe('Form: значения', () => {
    it('собираются на отправке, а не на каждом нажатии', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(
            <Form onSubmit={onSubmit}>
                <input name="city" defaultValue="Душанбе"/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        await user.type(screen.getByRole('textbox'), '!');

        expect(onSubmit).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button'));

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit.mock.calls[0][0]).toEqual({city: 'Душанбе!'});
    });

    it('повторяющееся имя приходит массивом', async () => {
        /* Группа чекбоксов и Select с несколькими значениями дают
           несколько полей с одним именем — это обычное дело. */
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(
            <Form onSubmit={onSubmit}>
                <input type="checkbox" name="currency" value="KZT" defaultChecked aria-label="KZT"/>
                <input type="checkbox" name="currency" value="USD" defaultChecked aria-label="USD"/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        await user.click(screen.getByRole('button'));

        expect(onSubmit.mock.calls[0][0]).toEqual({currency: ['KZT', 'USD']});
    });

    it('инструменты дают саму форму и очистку', async () => {
        const user = userEvent.setup();
        render(
            <Form onSubmit={(_values, tools) => tools.reset()}>
                <input name="sum" defaultValue="" aria-label="Сумма"/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        await user.type(screen.getByLabelText('Сумма'), '5000');
        await user.click(screen.getByRole('button'));

        expect(screen.getByLabelText('Сумма')).toHaveValue('');
    });
});

describe('Form: проверка', () => {
    function Sum() {
        const {errors} = useForm();

        return (
            <>
                <input name="sum" aria-label="Сумма" aria-invalid={errors.sum !== undefined}/>
                <span role="status">{errors.sum}</span>
            </>
        );
    }

    it('не пропускает отправку и показывает ошибку', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(
            <Form validate={() => ({sum: 'Не меньше 1000'})} onSubmit={onSubmit}>
                <Sum/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        await user.click(screen.getByRole('button'));

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('Не меньше 1000');
    });

    it('пустая карта ошибок — это «всё в порядке»', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(
            <Form validate={() => ({})} onSubmit={onSubmit}>
                <button type="submit">Дальше</button>
            </Form>,
        );

        await user.click(screen.getByRole('button'));

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('проверка может быть асинхронной', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(
            <Form
                validate={() => Promise.resolve({sum: 'Занято'})}
                onSubmit={onSubmit}
            >
                <Sum/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        await user.click(screen.getByRole('button'));

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Занято'));
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('ввод снимает ошибку этого поля и не трогает соседнюю', async () => {
        const user = userEvent.setup();
        function Pair() {
            const {errors} = useForm();

            return (
                <>
                    <input name="a" aria-label="A"/>
                    <input name="b" aria-label="B"/>
                    <span role="status">{`${errors.a ?? '—'}/${errors.b ?? '—'}`}</span>
                </>
            );
        }
        render(
            <Form validate={() => ({a: 'плохо A', b: 'плохо B'})}>
                <Pair/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        await user.click(screen.getByRole('button'));
        expect(screen.getByRole('status')).toHaveTextContent('плохо A/плохо B');

        await user.type(screen.getByLabelText('A'), '1');

        expect(screen.getByRole('status')).toHaveTextContent('—/плохо B');
    });

    it('фокус уходит на первое негодное поле', async () => {
        /*
         * Иначе на длинной форме человек остаётся смотреть на кнопку,
         * а ошибка оказывается за краем экрана (WCAG 3.3.1).
         */
        const user = userEvent.setup();
        render(
            <Form validate={() => ({b: 'плохо'})}>
                <input name="a" aria-label="А"/>
                <input name="b" aria-label="Б"/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        await user.click(screen.getByRole('button'));

        await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Б')));
    });

    it('focusInvalid={false} оставляет фокус на месте', async () => {
        const user = userEvent.setup();
        render(
            <Form validate={() => ({a: 'плохо'})} focusInvalid={false}>
                <input name="a" aria-label="А"/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        const button = screen.getByRole('button');
        await user.click(button);

        expect(document.activeElement).toBe(button);
    });
});

describe('Form: отправка', () => {
    it('повторные нажатия, пока идёт запрос, не считаются', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 50)));
        render(
            <Form onSubmit={onSubmit}>
                <button type="submit">Дальше</button>
            </Form>,
        );

        const button = screen.getByRole('button');
        await Promise.all([user.click(button), user.click(button), user.click(button)]);

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });

    it('pending виден детям, пока идёт отправка', async () => {
        const user = userEvent.setup();
        render(
            <Form onSubmit={() => new Promise(resolve => setTimeout(resolve, 30))}>
                {({pending}) => (
                    <>
                        <span role="status">{pending ? 'идёт' : 'тихо'}</span>
                        <button type="submit">Дальше</button>
                    </>
                )}
            </Form>,
        );

        await user.click(screen.getByRole('button'));

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('тихо'));
    });

    it('ошибки сервера возвращаются через инструменты', async () => {
        const user = userEvent.setup();
        render(
            <Form onSubmit={(_values, tools) => tools.setErrors({login: 'Логин занят'})}>
                {({errors}) => (
                    <>
                        <input name="login" aria-label="Логин"/>
                        <span role="status">{errors.login}</span>
                        <button type="submit">Дальше</button>
                    </>
                )}
            </Form>,
        );

        await user.click(screen.getByRole('button'));

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Логин занят'));
    });

    it('ошибки снаружи складываются с найденными', async () => {
        const user = userEvent.setup();
        render(
            <Form validate={() => ({a: 'из проверки'})} errors={{b: 'снаружи'}}>
                {({errors}) => (
                    <>
                        <span role="status">{`${errors.a ?? '—'}/${errors.b ?? '—'}`}</span>
                        <button type="submit">Дальше</button>
                    </>
                )}
            </Form>,
        );

        expect(screen.getByRole('status')).toHaveTextContent('—/снаружи');

        await user.click(screen.getByRole('button'));

        expect(screen.getByRole('status')).toHaveTextContent('из проверки/снаружи');
    });

    it('упавший запрос уходит в onError, а не теряется', async () => {
        const user = userEvent.setup();
        const onError = vi.fn();
        render(
            <Form onSubmit={() => Promise.reject(new Error('сеть'))} onError={onError}>
                <button type="submit">Дальше</button>
            </Form>,
        );

        await user.click(screen.getByRole('button'));

        await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
        expect(String(onError.mock.calls[0][0])).toContain('сеть');
    });

    it('resetOnSubmit очищает поля только после удачной отправки', async () => {
        const user = userEvent.setup();
        render(
            <Form resetOnSubmit validate={values => (values.name === '' ? {name: 'Пусто'} : undefined)}>
                <input name="name" aria-label="Имя" defaultValue=""/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        await user.click(screen.getByRole('button'));
        await user.type(screen.getByLabelText('Имя'), 'Иван');
        await user.click(screen.getByRole('button'));

        await waitFor(() => expect(screen.getByLabelText('Имя')).toHaveValue(''));
    });
});

describe('Form: платформа', () => {
    it('по умолчанию проверяет сама: у формы стоит noValidate', () => {
        const {container} = render(<Form><input name="a" required/></Form>);

        expect(container.querySelector('form')).toHaveAttribute('novalidate');
    });

    it('native={true} отдаёт первую проверку браузеру', async () => {
        /*
         * Текст такой ошибки — на языке браузера, а не страницы
         * (замерено: «Please fill out this field.» при lang="ru").
         * Поэтому режим не по умолчанию.
         */
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        const {container} = render(
            <Form native onSubmit={onSubmit}>
                <input name="a" required aria-label="А"/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        expect(container.querySelector('form')).not.toHaveAttribute('novalidate');

        await user.click(screen.getByRole('button'));

        expect(onSubmit).not.toHaveBeenCalled();

        await user.type(screen.getByLabelText('А'), 'есть');
        await user.click(screen.getByRole('button'));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });

    it('это обычный <form>: пропсы тега доходят', () => {
        const {container} = render(<Form id="шаг" aria-label="Заявка"><input name="a"/></Form>);
        const form = container.querySelector('form')!;

        expect(form.id).toBe('шаг');
        expect(form).toHaveAttribute('aria-label', 'Заявка');
    });
});

describe('Form: разное', () => {
    it('useForm вне формы бросает, а не молчит', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        function Alone() {
            useForm();

            return null;
        }

        expect(() => render(<Alone/>)).toThrow(/вне <Form>/);
        error.mockRestore();
    });

    it('проходит axe', async () => {
        const {container} = render(
            <Form>
                <label htmlFor="sum">Сумма</label>
                <input id="sum" name="sum"/>
                <button type="submit">Дальше</button>
            </Form>,
        );

        expect((await axe.run(container, {rules: {'color-contrast': {enabled: false}}})).violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Form><input name="a"/></Form>);

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
