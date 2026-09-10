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
