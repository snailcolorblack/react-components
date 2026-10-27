import {render, screen} from '@testing-library/react';
import {createRef} from 'react';
import {describe, expect, it} from 'vitest';
import {Dialog} from '../Dialog/Dialog';
import {Popover} from '../Popover/Popover';
import {Alert} from './Alert';

describe('Alert', () => {
    it('по умолчанию не является живым регионом', () => {
        render(<Alert>Сообщение</Alert>);
        // статичные алерты не должны зачитываться при монтировании
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.queryByRole('status')).toBeNull();
        expect(screen.getByText('Сообщение')).toBeInTheDocument();
    });

    it('live + ERROR даёт assertive role="alert"', () => {
        render(<Alert live variant="ERROR">Ошибка</Alert>);
        expect(screen.getByRole('alert')).toHaveTextContent('Ошибка');
    });

    it('live + остальные варианты дают polite role="status"', () => {
        render(<Alert live variant="SUCCESS">Готово</Alert>);
        expect(screen.getByRole('status')).toHaveTextContent('Готово');
    });

    it('вариант уезжает в data-атрибут', () => {
        render(<Alert variant="WARNING">Внимание</Alert>);
        expect(screen.getByText('Внимание')).toHaveAttribute('data-variant', 'WARNING');
    });

    it('принимает ref и сохраняет className', () => {
        const ref = createRef<HTMLDivElement>();
        render(<Alert ref={ref} className="mine">Текст</Alert>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
        expect(screen.getByText('Текст')).toHaveClass('mine');
    });

    it('role можно перебить снаружи', () => {
        render(<Alert role="note">Заметка</Alert>);
        expect(screen.getByRole('note')).toBeInTheDocument();
    });
});

describe('Dialog', () => {
    it('рендерит нативный dialog и принимает ref', () => {
        const ref = createRef<HTMLDialogElement>();
        const {container} = render(<Dialog ref={ref}>Контент</Dialog>);
        expect(container.querySelector('dialog')).not.toBeNull();
        expect(ref.current?.tagName).toBe('DIALOG');
    });
});

describe('Popover', () => {
    it('ставит атрибут popover и id для связи с триггером', () => {
        const {container} = render(<Popover id="pop">Контент</Popover>);
        const popover = container.querySelector('#pop');
        expect(popover).toHaveAttribute('popover', 'auto');
    });

    it('режим popover можно поменять', () => {
        const {container} = render(<Popover id="pop" popover="manual">Контент</Popover>);
        expect(container.querySelector('#pop')).toHaveAttribute('popover', 'manual');
    });
});

describe('Alert: вариант не только цветом', () => {
    /*
     * Замерено: до этой правки варианты различались только цветом рамки
     * и фона — ::before был пуст. Цвет один смысл нести не может (WCAG 1.4.1),
     * и в режиме высокого контраста система его подменяет.
     */
    it('у каждого варианта своё слово в озвучке', () => {
        const {rerender} = render(<Alert variant="ERROR">Не сохранилось</Alert>);

        expect(screen.getByText('Ошибка.')).toBeInTheDocument();

        rerender(<Alert variant="WARNING">Скоро закончится</Alert>);
        expect(screen.getByText('Предупреждение.')).toBeInTheDocument();

        rerender(<Alert variant="SUCCESS">Сохранено</Alert>);
        expect(screen.getByText('Готово.')).toBeInTheDocument();
    });

    it('слово скрыто от глаз, а значок — от озвучки', () => {
        const {container} = render(<Alert withIcon variant="ERROR">Не сохранилось</Alert>);
        const icon = container.querySelector('[aria-hidden="true"]');

        expect(icon?.querySelector('svg')).not.toBeNull();
        /* Слово вынесено из потока и не занимает места: его видит только озвучка. */
        expect(screen.getByText('Ошибка.')).toHaveStyle({position: 'absolute'});
    });

    it('без варианта ни значка, ни слова', () => {
        const {container} = render(<Alert withIcon>Просто сообщение</Alert>);

        expect(container.querySelector('svg')).toBeNull();
        expect(screen.queryByText(/Ошибка\.|Готово\.|Предупреждение\./)).toBeNull();
    });

    it('слово остаётся и без значка: озвучке вариант по-прежнему слышен', () => {
        const {container} = render(<Alert variant="ERROR">Не сохранилось</Alert>);

        expect(container.querySelector('svg')).toBeNull();
        expect(screen.getByText('Ошибка.')).toBeInTheDocument();
    });
});

describe('Alert: значок', () => {
    it('по умолчанию значка нет', () => {
        const {container} = render(<Alert variant="SUCCESS">Сохранено</Alert>);

        expect(container.querySelector('svg')).toBeNull();
        expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    });

    it('withIcon показывает стандартный значок варианта', () => {
        const {container, rerender} = render(<Alert withIcon variant="SUCCESS">Сохранено</Alert>);
        const первый = container.querySelector('svg')?.innerHTML;

        expect(первый).toBeDefined();

        /* У каждого варианта свой силуэт: цвет в высоком контрасте
           подменяет система, а форма остаётся. */
        rerender(<Alert withIcon variant="ERROR">Не сохранилось</Alert>);
        expect(container.querySelector('svg')?.innerHTML).not.toBe(первый);
    });

    it('withIcon={false} оставляет плашку без значка', () => {
        const {container} = render(<Alert withIcon={false} variant="WARNING">Скоро</Alert>);

        expect(container.querySelector('svg')).toBeNull();
    });

    it('свой значок показывается и без withIcon', () => {
        const {container} = render(
            <Alert variant="SUCCESS" icon={<span data-testid="mine">!</span>}>Сохранено</Alert>,
        );

        expect(screen.getByTestId('mine')).toBeInTheDocument();
        expect(container.querySelector('svg')).toBeNull();
    });

    it('свой значок заменяет стандартный, а не добавляется к нему', () => {
        const {container} = render(
            <Alert withIcon variant="SUCCESS" icon={<span data-testid="mine">!</span>}>Сохранено</Alert>,
        );

        expect(screen.getByTestId('mine')).toBeInTheDocument();
        expect(container.querySelector('svg')).toBeNull();
    });

    it('значок скрыт от озвучки: он повторяет слово', () => {
        const {container} = render(<Alert withIcon variant="ERROR">Ошибка</Alert>);

        expect(container.querySelector('[aria-hidden="true"]')?.querySelector('svg')).not.toBeNull();
    });
});
