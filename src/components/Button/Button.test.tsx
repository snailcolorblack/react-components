import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {createRef, type FormEvent, type MouseEvent, type ReactNode} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {Button} from './Button';
import styles from './Button.module.css';

describe('Button', () => {
    it('рендерит содержимое и по умолчанию type="button"', () => {
        render(<Button>Сохранить</Button>);
        const button = screen.getByRole('button', {name: 'Сохранить'});
        expect(button).toHaveAttribute('type', 'button');
    });

    it('не перебивает явно заданный type', () => {
        render(<Button type="submit">Отправить</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('принимает ref без forwardRef (React 19)', () => {
        const ref = createRef<HTMLButtonElement>();
        render(<Button ref={ref}>Кнопка</Button>);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('сохраняет пользовательский className рядом со своими', () => {
        render(<Button className="my-own">Кнопка</Button>);
        expect(screen.getByRole('button')).toHaveClass('my-own');
    });

    it('свой data-state не затирается, а active его перебивает', () => {
        const {rerender} = render(<Button data-state="loading">Кнопка</Button>);
        // ставится после {...rest}, поэтому раньше пропадал молча
        expect(screen.getByRole('button')).toHaveAttribute('data-state', 'loading');
        rerender(<Button data-state="loading" active>Кнопка</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-state', 'active');
    });

    it('active выставляет data-state', () => {
        const {rerender} = render(<Button>Кнопка</Button>);
        expect(screen.getByRole('button')).not.toHaveAttribute('data-state');
        rerender(<Button active>Кнопка</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-state', 'active');
    });

    it('loading помечает кнопку aria-busy и aria-disabled, но НЕ disabled', () => {
        render(<Button loading>Сохранить</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(button).toHaveAttribute('aria-disabled', 'true');
        // disabled выбросил бы кнопку из таба и увёл фокус в начало документа
        expect(button).not.toBeDisabled();
    });

    it('свои aria-disabled и aria-busy не затираются', () => {
        render(<Button aria-disabled aria-busy role="menuitem">Архив</Button>);
        const button = screen.getByRole('menuitem');
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('loading не отменяет свой aria-disabled, а без loading он остаётся', () => {
        const {rerender} = render(<Button aria-disabled loading>Архив</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
        rerender(<Button aria-disabled>Архив</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
    });

    it('aria-disabled="false" передаётся как есть', () => {
        render(<Button aria-disabled="false">Кнопка</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'false');
    });

    it('loading оставляет кнопку в порядке табуляции', async () => {
        render(<Button loading>Сохранить</Button>);
        await userEvent.tab();
        expect(screen.getByRole('button')).toHaveFocus();
    });

    it('loading гасит onClick', async () => {
        const onClick = vi.fn();
        render(<Button loading onClick={onClick}>Сохранить</Button>);
        await userEvent.click(screen.getByRole('button'));
        expect(onClick).not.toHaveBeenCalled();
    });

    it('без loading onClick вызывается', async () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Сохранить</Button>);
        await userEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('disabled блокирует клик', async () => {
        const onClick = vi.fn();
        render(<Button disabled onClick={onClick}>Сохранить</Button>);
        await userEvent.click(screen.getByRole('button'));
        expect(onClick).not.toHaveBeenCalled();
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('спиннер скрыт от скринридера, а подпись остаётся в DOM', () => {
        render(<Button loading>Сохранить</Button>);
        // текст не удаляется — иначе ширина кнопки скакала бы
        expect(screen.getByRole('button')).toHaveTextContent('Сохранить');
    });
});

/* -------------------------------------------------------------------------- */
/*  Варианты оформления                                                       */
/*                                                                            */
/*  Здесь проверяется только выбор класса: сам вид — заливка, отступы,        */
/*  фокусное кольцо — считается движком, которого в jsdom нет. Он меряется    */
/*  в браузере, и там же поймана единственная поломка INLINE: unset           */
/*  в --button-ring убирал outline целиком.                                    */
/* -------------------------------------------------------------------------- */

describe('Button variant', () => {
    it.each([
        ['DEFAULT', 'default'],
        ['OUTLINE', 'outline'],
        ['CONTRAST', 'contrast'],
        ['INLINE', 'inline'],
    ] as const)('variant="%s" ставит класс %s', (variant, expected) => {
        render(<Button variant={variant}>Кнопка</Button>);
        expect(screen.getByRole('button')).toHaveClass(styles[expected]);
    });

    it('по умолчанию DEFAULT', () => {
        render(<Button>Кнопка</Button>);
        expect(screen.getByRole('button')).toHaveClass(styles.default);
    });

    it('вариант не смешивается с соседним', () => {
        render(<Button variant="INLINE">Кнопка</Button>);
        const button = screen.getByRole('button');
        expect(button).not.toHaveClass(styles.default);
        expect(button).not.toHaveClass(styles.outline);
        expect(button).not.toHaveClass(styles.contrast);
    });

    /* ---------------------------------------------------------------- */
    /*  INLINE остаётся кнопкой                                         */
    /*                                                                  */
    /*  Меняется только оформление: ни роль, ни клавиатура, ни форма,   */
    /*  ни состояния от варианта не зависят — и это то, что легко       */
    /*  сломать, подменив INLINE на span со стилями.                     */
    /* ---------------------------------------------------------------- */

    it('INLINE — это кнопка с ролью button и type="button"', () => {
        render(<Button variant="INLINE">Отменить</Button>);
        const button = screen.getByRole('button', {name: 'Отменить'});
        expect(button.tagName).toBe('BUTTON');
        expect(button).toHaveAttribute('type', 'button');
    });

    it('INLINE доступен с клавиатуры и жмётся пробелом', async () => {
        const onClick = vi.fn();
        render(<Button variant="INLINE" onClick={onClick}>Отменить</Button>);

        await userEvent.tab();
        expect(screen.getByRole('button')).toHaveFocus();

        await userEvent.keyboard(' ');
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('INLINE отправляет форму, если type="submit"', async () => {
        const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
        render(
            <form onSubmit={onSubmit}>
                <Button variant="INLINE" type="submit">Отправить</Button>
            </form>,
        );

        await userEvent.click(screen.getByRole('button'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('INLINE поддерживает disabled и loading', () => {
        const {rerender} = render(<Button variant="INLINE" disabled>Отменить</Button>);
        expect(screen.getByRole('button')).toBeDisabled();

        rerender(<Button variant="INLINE" loading>Отменить</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(button).not.toBeDisabled();
        expect(button).toHaveTextContent('Отменить');
    });

    it('INLINE работает и на ссылке', () => {
        render(<Button as="a" href="/terms" variant="INLINE">условиями</Button>);
        const link = screen.getByRole('link', {name: 'условиями'});
        expect(link).toHaveClass(styles.inline);
        expect(link).toHaveAttribute('href', '/terms');
    });

    it('INLINE проходит axe внутри текста', async () => {
        const {container} = render(
            <p>
                Черновик сохранён.{' '}
                <Button variant="INLINE">Отменить</Button>
            </p>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });
});

/* -------------------------------------------------------------------------- */
/*  as="a"                                                                    */
/*                                                                            */
/*  Клавиатуры здесь нет: то, что ссылка срабатывает по Enter и молчит        */
/*  на пробел, делает браузер, а jsdom этого не воспроизводит. Проверено      */
/*  в Chromium; тут — разметка, роль и гашение клика.                          */
/* -------------------------------------------------------------------------- */

describe('Button as="a"', () => {
    it('рендерит ссылку, а не кнопку', () => {
        render(<Button as="a" href="/pricing">Тарифы</Button>);
        const link = screen.getByRole('link', {name: 'Тарифы'});
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', '/pricing');
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('не подставляет ссылке type', () => {
        render(<Button as="a" href="/pricing">Тарифы</Button>);
        // у <a> type означал бы MIME-подсказку
        expect(screen.getByRole('link')).not.toHaveAttribute('type');
    });

    it('носит те же классы оформления, что и кнопка', () => {
        render(
            <>
                <Button variant="OUTLINE" size="FULL">Кнопка</Button>
                <Button as="a" href="/x" variant="OUTLINE" size="FULL">Ссылка</Button>
            </>,
        );
        expect(screen.getByRole('link').className).toBe(screen.getByRole('button').className);
    });

    it('пропускает пропсы ссылки', () => {
        render(
            <Button as="a" href="/x" target="_blank" rel="noreferrer" aria-current="page">
                Тарифы
            </Button>,
        );
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer');
        expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('ref указывает на ссылку', () => {
        const ref = createRef<HTMLAnchorElement>();
        render(<Button as="a" href="/x" ref={ref}>Тарифы</Button>);
        expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
    });

    it('active и loading работают так же', () => {
        render(<Button as="a" href="/x" active loading>Отчёт</Button>);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('data-state', 'active');
        expect(link).toHaveAttribute('aria-busy', 'true');
        expect(link).toHaveAttribute('aria-disabled', 'true');
    });

    it('loading отменяет переход', async () => {
        const onClick = vi.fn();
        render(<Button as="a" href="/x" loading onClick={onClick}>Отчёт</Button>);

        await userEvent.click(screen.getByRole('link'));
        expect(onClick).not.toHaveBeenCalled();
    });

    it('без loading клик по ссылке проходит', async () => {
        const onClick = vi.fn((event: MouseEvent<HTMLAnchorElement>) => event.preventDefault());
        render(<Button as="a" href="/x" onClick={onClick}>Отчёт</Button>);

        await userEvent.click(screen.getByRole('link'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('загруженная ссылка остаётся в порядке табуляции', async () => {
        render(<Button as="a" href="/x" loading>Отчёт</Button>);
        await userEvent.tab();
        expect(screen.getByRole('link')).toHaveFocus();
    });

    it('подпись и спиннер лежат внутри ссылки', () => {
        render(<Button as="a" href="/x" loading>Отчёт</Button>);
        expect(screen.getByRole('link')).toHaveTextContent('Отчёт');
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Button as="a" href="/x" variant="CONTRAST" loading>Отчёт</Button>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});

describe('Button в форме', () => {
    /** Форма, действие которой держится до ручного resolve. */
    function Form({children}: {children: ReactNode}) {
        return <form action={() => hold.promise}>{children}</form>;
    }

    let hold: {promise: Promise<void>, done: () => void};

    beforeEach(function prepare() {
        let done: () => void = () => undefined;
        const promise = new Promise<void>(resolve => (done = resolve));

        hold = {promise, done};
    });

    it('кнопка отправки показывает загрузку, пока работает действие формы', async () => {
        render(<Form><Button type="submit">Сохранить</Button></Form>);
        const button = screen.getByRole('button', {name: 'Сохранить'});

        expect(button).not.toHaveAttribute('aria-busy');

        await userEvent.click(button);
        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(button).toHaveAttribute('aria-disabled', 'true');

        await act(async () => {
            hold.done();
            await hold.promise;
        });
        expect(button).not.toHaveAttribute('aria-busy');
    });

    it('обычная кнопка в той же форме не крутится', async () => {
        render(
            <Form>
                <Button type="submit">Сохранить</Button>
                <Button>Сбросить</Button>
            </Form>,
        );

        await userEvent.click(screen.getByRole('button', {name: 'Сохранить'}));
        expect(screen.getByRole('button', {name: 'Сбросить'})).not.toHaveAttribute('aria-busy');

        await act(async () => {
            hold.done();
            await hold.promise;
        });
    });

    it('явный loading={false} отменяет связь с формой', async () => {
        render(<Form><Button type="submit" loading={false}>Сохранить</Button></Form>);
        const button = screen.getByRole('button', {name: 'Сохранить'});

        await userEvent.click(button);
        expect(button).not.toHaveAttribute('aria-busy');

        await act(async () => {
            hold.done();
            await hold.promise;
        });
    });

    it('вне формы ничего не меняется', () => {
        render(<Button type="submit">Сохранить</Button>);
        expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
    });
});
