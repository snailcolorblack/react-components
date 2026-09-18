import {render, screen} from '@testing-library/react';
import axe from 'axe-core';
import {createRef} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Typography} from './Typography';
import styles from './Typography.module.css';

/*
 * Проверяется разметка и выбор класса: какой тег вышел, какой размер к нему
 * прикрепился, не потерялись ли чужие пропсы.
 *
 * Самих размеров тут нет — var() в jsdom не вычисляется, и сравнивать
 * пришлось бы с именем переменной, а не с пикселями. Соответствие
 * «класс → размер» меряется в браузере.
 */

describe('Typography', () => {
    it('по умолчанию это абзац размера p', () => {
        render(<Typography>Текст</Typography>);
        const node = screen.getByText('Текст');
        expect(node.tagName).toBe('P');
        expect(node).toHaveClass(styles.text, styles.p);
    });

    /* ---------------------------------------------------------------- */
    /*  as задаёт тег                                                   */
    /* ---------------------------------------------------------------- */

    it.each([
        ['h1', 'H1'],
        ['h2', 'H2'],
        ['h3', 'H3'],
        ['h4', 'H4'],
        ['h5', 'H5'],
        ['h6', 'H6'],
        ['p', 'P'],
        ['span', 'SPAN'],
        ['div', 'DIV'],
        ['small', 'SMALL'],
        ['strong', 'STRONG'],
        ['em', 'EM'],
        ['blockquote', 'BLOCKQUOTE'],
        ['figcaption', 'FIGCAPTION'],
    ] as const)('as="%s" рендерит <%s>', (as, tagName) => {
        render(<Typography as={as}>Текст</Typography>);
        expect(screen.getByText('Текст').tagName).toBe(tagName);
    });

    it('заголовок остаётся заголовком для скринридера', () => {
        render(<Typography as="h2">Раздел</Typography>);
        expect(screen.getByRole('heading', {level: 2})).toHaveTextContent('Раздел');
    });

    /* ---------------------------------------------------------------- */
    /*  Размер выводится из тега                                        */
    /* ---------------------------------------------------------------- */

    it.each([
        ['h1', 'h1'],
        ['h3', 'h3'],
        ['h6', 'h6'],
        ['p', 'p'],
        ['span', 'p'],
        ['div', 'p'],
        ['li', 'p'],
        ['strong', 'p'],
        ['em', 'p'],
        ['label', 'p'],
        ['blockquote', 'p'],
        // у этих двух свой обычный размер
        ['small', 'note'],
        ['figcaption', 'caption'],
    ] as const)('as="%s" без variant берёт размер %s', (as, expected) => {
        render(<Typography as={as}>Текст</Typography>);
        expect(screen.getByText('Текст')).toHaveClass(styles[expected]);
    });

    /* ---------------------------------------------------------------- */
    /*  Тег выводится из размера                                        */
    /* ---------------------------------------------------------------- */

    it.each([
        ['h1', 'H1'],
        ['h4', 'H4'],
        ['p', 'P'],
        // размеры вне шкалы структуру не выбирают
        ['caption', 'P'],
        ['note', 'P'],
        ['lead', 'P'],
        ['subtitle', 'P'],
    ] as const)('variant="%s" без as рендерит <%s>', (variant, tagName) => {
        render(<Typography variant={variant}>Текст</Typography>);
        expect(screen.getByText('Текст').tagName).toBe(tagName);
    });

    /* ---------------------------------------------------------------- */
    /*  Семантика и размер расходятся                                   */
    /* ---------------------------------------------------------------- */

    it('as и variant независимы: h1 размером h3', () => {
        render(<Typography as="h1" variant="h3">Настройки</Typography>);
        const node = screen.getByRole('heading', {level: 1});
        expect(node).toHaveClass(styles.h3);
        expect(node).not.toHaveClass(styles.h1);
    });

    it('крупное число не становится заголовком', () => {
        render(<Typography as="p" variant="h2">128</Typography>);
        const node = screen.getByText('128');
        expect(node.tagName).toBe('P');
        expect(node).toHaveClass(styles.h2);
        expect(screen.queryByRole('heading')).toBeNull();
    });

    it.each(['caption', 'note', 'lead', 'subtitle'] as const)(
        'variant="%s" ставит свой класс размера', (variant) => {
            render(<Typography variant={variant}>Текст</Typography>);
            expect(screen.getByText('Текст')).toHaveClass(styles[variant]);
        });

    /* ---------------------------------------------------------------- */
    /*  Пропсы тега не теряются                                         */
    /* ---------------------------------------------------------------- */

    it('добавляет свой класс, а не заменяет им базовый', () => {
        render(<Typography className="my">Текст</Typography>);
        expect(screen.getByText('Текст')).toHaveClass(styles.text, styles.p, 'my');
    });

    it('без className не оставляет висячего пробела в атрибуте', () => {
        render(<Typography>Текст</Typography>);
        expect(screen.getByText('Текст').getAttribute('class')).toBe(`${styles.text} ${styles.p}`);
    });

    it('пропускает пропсы выбранного тега', () => {
        render(<Typography as="label" htmlFor="field">Имя</Typography>);
        expect(screen.getByText('Имя')).toHaveAttribute('for', 'field');
    });

    it('пропускает id, data- и aria-', () => {
        render(
            <Typography id="total" data-kind="sum" aria-live="polite">
                128
            </Typography>,
        );
        const node = screen.getByText('128');
        expect(node).toHaveAttribute('id', 'total');
        expect(node).toHaveAttribute('data-kind', 'sum');
        expect(node).toHaveAttribute('aria-live', 'polite');
    });

    it('style автора доходит до элемента', () => {
        render(<Typography style={{opacity: 0.5}}>Текст</Typography>);
        expect(screen.getByText('Текст').style.opacity).toBe('0.5');
    });

    it('ref указывает на сам элемент', () => {
        const ref = createRef<HTMLHeadingElement>();
        render(<Typography as="h2" ref={ref}>Раздел</Typography>);
        expect(ref.current).toBe(screen.getByRole('heading', {level: 2}));
    });

    it('обработчики событий работают', async () => {
        const onClick = vi.fn();
        render(<Typography as="span" onClick={onClick}>Текст</Typography>);
        screen.getByText('Текст').click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    /* ---------------------------------------------------------------- */
    /*  Доступность                                                     */
    /* ---------------------------------------------------------------- */

    it('проходит axe', async () => {
        const {container} = render(
            <>
                <Typography as="h1" variant="h3">Заголовок</Typography>
                <Typography variant="lead">Вводный абзац</Typography>
                <Typography variant="caption">Сноска</Typography>
            </>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Typography as="small" variant="caption">Текст</Typography>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
