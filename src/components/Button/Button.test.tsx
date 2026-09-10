import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createRef} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Button} from './Button';

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
