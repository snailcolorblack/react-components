import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {createRef} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Wrapper} from './Wrapper';

/*
 * Разметка, теги и пропсы. Чего здесь нет: вида — отступ, скругление
 * и снятие собственных стилей тега живут в CSS, и проверены замерами
 * в Chromium 141 (см. шапку Wrapper.module.css). Здесь — то, чем
 * распоряжается сам компонент.
 */

describe('Wrapper: тег', () => {
    it('по умолчанию это div', () => {
        const {container} = render(<Wrapper>Блок</Wrapper>);

        expect(container.firstElementChild?.tagName.toLowerCase()).toBe('div');
    });

    it('тег меняется пропом', () => {
        const {container} = render(<Wrapper as="article">Статья</Wrapper>);

        expect(container.firstElementChild?.tagName.toLowerCase()).toBe('article');
    });

    it('содержимое отрисовано как есть', () => {
        render(<Wrapper><span>Внутри</span></Wrapper>);

        expect(screen.getByText('Внутри')).toBeInTheDocument();
    });

    it('своих ролей и aria не добавляет: это коробка, а не виджет', () => {
        const {container} = render(<Wrapper as="section">Блок</Wrapper>);
        const node = container.firstElementChild!;

        expect(node.getAttribute('role')).toBeNull();
        expect([...node.attributes].map(a => a.name).filter(name => name.startsWith('aria-'))).toEqual([]);
    });
});

describe('Wrapper: пропсы тега', () => {
    it('as="a" принимает адрес и остаётся ссылкой', () => {
        render(<Wrapper as="a" href="/счета">Счета</Wrapper>);

        expect(screen.getByRole('link', {name: 'Счета'})).toHaveAttribute('href', '/счета');
    });

    it('as="button" по умолчанию не отправляет форму', async () => {
        /*
         * У <button> без type подразумевается submit: нажимаемая карточка
         * внутри формы отправляла бы её молча.
         */
        const user = userEvent.setup();
        const onSubmit = vi.fn(event => event.preventDefault());
        render(
            <form onSubmit={onSubmit}>
                <Wrapper as="button">Карточка</Wrapper>
            </form>,
        );

        expect(screen.getByRole('button')).toHaveAttribute('type', 'button');

        await user.click(screen.getByRole('button'));

        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('переданный type сильнее подразумеваемого', () => {
        render(<Wrapper as="button" type="submit">Отправить</Wrapper>);

        expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('у не-кнопки атрибута type не появляется', () => {
        const {container} = render(<Wrapper as="section">Блок</Wrapper>);

        expect(container.firstElementChild?.hasAttribute('type')).toBe(false);
    });

    it('обработчики и прочие пропсы доходят до тега', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<Wrapper as="button" id="карточка" data-test="да" onClick={onClick}>Блок</Wrapper>);

        await user.click(screen.getByRole('button'));

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(document.getElementById('карточка')).toHaveAttribute('data-test', 'да');
    });

    it('ref указывает на сам тег', () => {
        const ref = createRef<HTMLElement>();
        render(<Wrapper as="article" ref={ref}>Блок</Wrapper>);

        expect(ref.current?.tagName.toLowerCase()).toBe('article');
    });
});

describe('Wrapper: оформление', () => {
    it('свой класс не вытесняет собственный', () => {
        const {container} = render(<Wrapper className="мой">Блок</Wrapper>);
        const node = container.firstElementChild as HTMLElement;

        expect(node.className).toContain('мой');
        expect(node.className.split(' ').length).toBeGreaterThan(1);
    });

    it('PLAIN и CARD — разные наборы классов', () => {
        const карточка = render(<Wrapper>Блок</Wrapper>);
        const пустая = render(<Wrapper variant="PLAIN">Блок</Wrapper>);

        const первый = (карточка.container.firstElementChild as HTMLElement).className;
        const второй = (пустая.container.firstElementChild as HTMLElement).className;

        expect(первый).not.toBe(второй);
        /* Общий класс остаётся у обоих: раскладка и контейнер — не вариант. */
        expect(первый.split(' ')[0]).toBe(второй.split(' ')[0]);
    });
});

describe('Wrapper: доступность', () => {
    it('проходит axe в каждом из тегов', async () => {
        for (const тег of ['div', 'article', 'section', 'form'] as const) {
            const {container, unmount} = render(<Wrapper as={тег}>Блок</Wrapper>);

            expect((await axe.run(container, {rules: {'color-contrast': {enabled: false}}})).violations).toEqual([]);
            unmount();
        }
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Wrapper as="button">Блок</Wrapper>);
        render(<Wrapper as="form"><input name="поле"/></Wrapper>);

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
