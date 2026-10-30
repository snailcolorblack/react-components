import {render, screen} from '@testing-library/react';
import axe from 'axe-core';
import {describe, expect, it, vi} from 'vitest';
import {Container} from './Container';

/*
 * Разметка и классы. Чего здесь нет: самих размеров и отступов —
 * их считает движок, и они замерены в Chromium 141 (см. шапку
 * Container.module.css). Проверяется то, чем распоряжается компонент.
 *
 * Замерено при окне 1900px: WIDE — 1440px, NORMAL — 1064px,
 * PHONE — 480px, все три по середине родителя. Отступ: 16px при окне
 * до 400px, 32px от 800px. У вложенного контейнера отступ нулевой.
 */

describe('Container: размер', () => {
    function классы(node: Element | null) {
        return (node as HTMLElement).className.split(' ');
    }

    it('по умолчанию обычный разворот', () => {
        const {container} = render(<Container>Содержимое</Container>);
        const обычный = render(<Container size="NORMAL">Содержимое</Container>);

        expect(классы(container.firstElementChild)).toEqual(классы(обычный.container.firstElementChild));
    });

    it('у каждого размера свой класс', () => {
        const набор = (['WIDE', 'NORMAL', 'PHONE'] as const).map(size => {
            const {container, unmount} = render(<Container size={size}>Содержимое</Container>);
            const className = (container.firstElementChild as HTMLElement).className;
            unmount();

            return className;
        });

        expect(new Set(набор).size).toBe(3);
    });

    it('общий класс остаётся у всех размеров: отступ и середина — не вариант', () => {
        const широкий = render(<Container size="WIDE">A</Container>);
        const узкий = render(<Container size="PHONE">Б</Container>);

        const общие = классы(широкий.container.firstElementChild)
            .filter(name => классы(узкий.container.firstElementChild).includes(name));

        /* Общими обязаны быть класс обёртки, её PLAIN и сам контейнер. */
        expect(общие.length).toBeGreaterThanOrEqual(3);
    });
});

describe('Container: тег и пропсы', () => {
    it('по умолчанию это div', () => {
        const {container} = render(<Container>Содержимое</Container>);

        expect(container.firstElementChild?.tagName.toLowerCase()).toBe('div');
    });

    it('тег меняется: раскладка не обязана быть безымянной', () => {
        render(<Container as="main">Содержимое</Container>);

        expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('свой класс не вытесняет собственные', () => {
        const {container} = render(<Container className="мой">Содержимое</Container>);
        const node = container.firstElementChild as HTMLElement;

        expect(node.className).toContain('мой');
        expect(node.className.split(' ').length).toBeGreaterThan(1);
    });

    it('остальные пропсы доходят до тега', () => {
        const {container} = render(<Container id="страница" data-test="да">Содержимое</Container>);

        expect(container.firstElementChild).toHaveAttribute('id', 'страница');
        expect(container.firstElementChild).toHaveAttribute('data-test', 'да');
    });

    it('вложенность не ломает разметку: контейнер в контейнере — обычное дело', () => {
        const {container} = render(
            <Container size="WIDE">
                <Container size="PHONE">Внутри</Container>
            </Container>,
        );

        expect(container.querySelectorAll('div').length).toBe(2);
        expect(screen.getByText('Внутри')).toBeInTheDocument();
    });
});

describe('Container: доступность', () => {
    it('своих ролей и aria не добавляет', () => {
        const {container} = render(<Container>Содержимое</Container>);
        const node = container.firstElementChild!;

        expect(node.getAttribute('role')).toBeNull();
        expect([...node.attributes].map(a => a.name).filter(name => name.startsWith('aria-'))).toEqual([]);
    });

    it('проходит axe', async () => {
        const {container} = render(<Container as="main">Содержимое страницы</Container>);

        expect((await axe.run(container, {rules: {'color-contrast': {enabled: false}}})).violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Container size="WIDE" as="section">Содержимое</Container>);

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
