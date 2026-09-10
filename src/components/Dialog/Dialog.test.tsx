import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createRef, useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Dialog} from './Dialog';

function Controlled({initial = false, ...rest}: {initial?: boolean} & Record<string, unknown>) {
    const [open, setOpen] = useState(initial);

    return (
        <>
            <button onClick={() => setOpen(true)}>Открыть</button>
            <Dialog open={open} onClose={() => setOpen(false)} label="Диалог" {...rest}>
                <p>Содержимое</p>
                <button onClick={() => setOpen(false)}>Закрыть</button>
            </Dialog>
        </>
    );
}

describe('Dialog', () => {
    it('рендерит нативный dialog и принимает ref', () => {
        const ref = createRef<HTMLDialogElement>();
        const {container} = render(<Dialog ref={ref}>Контент</Dialog>);
        expect(container.querySelector('dialog')).not.toBeNull();
        expect(ref.current?.tagName).toBe('DIALOG');
    });

    it('закрыт по умолчанию', () => {
        const {container} = render(<Dialog>Контент</Dialog>);
        expect(container.querySelector('dialog')).not.toHaveAttribute('open');
    });

    it('open открывает диалог через showModal, а не атрибутом', async () => {
        // атрибут open открыл бы диалог немодально: без ::backdrop,
        // без ловушки фокуса и без Esc
        const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
        const show = vi.spyOn(HTMLDialogElement.prototype, 'show');
        try {
            const {container} = render(<Controlled/>);
            await userEvent.click(screen.getByRole('button', {name: 'Открыть'}));

            expect(showModal).toHaveBeenCalledTimes(1);
            expect(show).not.toHaveBeenCalled();
            expect(container.querySelector('dialog')!.open).toBe(true);
        } finally {
            showModal.mockRestore();
            show.mockRestore();
        }
    });

    it('снятие open закрывает диалог', async () => {
        const {container} = render(<Controlled initial/>);
        const dialog = container.querySelector('dialog')!;
        expect(dialog.open).toBe(true);

        await userEvent.click(screen.getByRole('button', {name: 'Закрыть'}));
        expect(dialog.open).toBe(false);
    });

    it('нативное закрытие поднимает onClose — состояние снаружи не разойдётся', () => {
        const onClose = vi.fn();
        const {container} = render(<Dialog open onClose={onClose}>Контент</Dialog>);
        const dialog = container.querySelector('dialog') as HTMLDialogElement;

        dialog.close();
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('label уезжает в aria-label', () => {
        render(<Dialog open label="Подтверждение">Контент</Dialog>);
        expect(screen.getByRole('dialog', {name: 'Подтверждение'})).toBeInTheDocument();
    });

    it('closedby по умолчанию any — клик по затемнению закрывает', () => {
        const {container} = render(<Dialog open>Контент</Dialog>);
        expect(container.querySelector('dialog')).toHaveAttribute('closedby', 'any');
    });

    it('closedBy можно сузить до Esc', () => {
        const {container} = render(<Dialog open closedBy="closerequest">Контент</Dialog>);
        expect(container.querySelector('dialog')).toHaveAttribute('closedby', 'closerequest');
    });

    it('сохраняет пользовательский className и произвольные атрибуты', () => {
        const {container} = render(<Dialog className="mine" data-testid="d">Контент</Dialog>);
        const dialog = container.querySelector('dialog');
        expect(dialog).toHaveClass('mine');
        expect(dialog).toHaveAttribute('data-testid', 'd');
    });

    it('собственный onClick не теряется', async () => {
        const onClick = vi.fn();
        render(<Dialog open onClick={onClick}>Контент</Dialog>);
        await userEvent.click(screen.getByRole('dialog'));
        expect(onClick).toHaveBeenCalled();
    });
});
