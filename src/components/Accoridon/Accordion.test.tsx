import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createRef} from 'react';
import {describe, expect, it} from 'vitest';
import {Accordion} from './Accordion';

describe('Accordion', () => {
    it('рендерит нативные details/summary', () => {
        const {container} = render(
            <Accordion>
                <Accordion.Header>Заголовок</Accordion.Header>
                <Accordion.Content>Контент</Accordion.Content>
            </Accordion>
        );
        expect(container.querySelector('details')).not.toBeNull();
        expect(container.querySelector('summary')).not.toBeNull();
    });

    it('open открывает по умолчанию', () => {
        const {container} = render(
            <Accordion open>
                <Accordion.Header>Заголовок</Accordion.Header>
                <Accordion.Content>Контент</Accordion.Content>
            </Accordion>
        );
        expect(container.querySelector('details')).toHaveAttribute('open');
    });

    it('пробрасывает нативные атрибуты, включая name для группировки', () => {
        const {container} = render(
            <Accordion name="group">
                <Accordion.Header>Заголовок</Accordion.Header>
            </Accordion>
        );
        expect(container.querySelector('details')).toHaveAttribute('name', 'group');
    });

    it('принимает ref без forwardRef', () => {
        const ref = createRef<HTMLDetailsElement>();
        render(
            <Accordion ref={ref}>
                <Accordion.Header>Заголовок</Accordion.Header>
            </Accordion>
        );
        expect(ref.current?.tagName).toBe('DETAILS');
    });

    it('по умолчанию подпись обёрнута в span, без заголовка', () => {
        render(
            <Accordion>
                <Accordion.Header>Заголовок</Accordion.Header>
            </Accordion>
        );
        expect(screen.queryByRole('heading')).toBeNull();
    });

    it('as="h3" делает подпись настоящим заголовком', () => {
        render(
            <Accordion>
                <Accordion.Header as="h3">Заголовок</Accordion.Header>
            </Accordion>
        );
        expect(screen.getByRole('heading', {level: 3, name: 'Заголовок'})).toBeInTheDocument();
    });

    it('иконка скрыта от скринридера', () => {
        const {container} = render(
            <Accordion>
                <Accordion.Header>Заголовок</Accordion.Header>
            </Accordion>
        );
        const icon = container.querySelector('summary > div');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('открывается с клавиатуры силами браузера', async () => {
        const {container} = render(
            <Accordion>
                <Accordion.Header>Заголовок</Accordion.Header>
                <Accordion.Content>Контент</Accordion.Content>
            </Accordion>
        );
        const details = container.querySelector('details');
        await userEvent.click(screen.getByText('Заголовок'));
        expect(details).toHaveAttribute('open');
    });

    it('сохраняет пользовательский className', () => {
        const {container} = render(
            <Accordion className="mine">
                <Accordion.Header className="head">Заголовок</Accordion.Header>
            </Accordion>
        );
        expect(container.querySelector('details')).toHaveClass('mine');
        expect(container.querySelector('summary')).toHaveClass('head');
    });
});
