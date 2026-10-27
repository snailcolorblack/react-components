// Pagination.tsx

/* -------------------------------------------------------------------------- */
/*  ПОСТРАНИЧНАЯ НАВИГАЦИЯ                                                    */
/*                                                                            */
/*  <nav> со списком, а не ряд кнопок. Причина не в красоте разметки:         */
/*  пагинация — ориентир, и скринридер обязан находить её в списке            */
/*  ориентиров и перескакивать к ней одним движением. Текущая страница        */
/*  помечена aria-current="page": отдельного aria-состояния для «вы здесь»    */
/*  не существует, и подменять его на aria-selected или aria-pressed нельзя — */
/*  те значат совсем другое.                                                  */
/*                                                                            */
/*  Сами кнопки и ссылки — общий Button. Своего оформления у пагинации нет:   */
/*  кольцо фокуса, выключенное состояние, поведение в высоком контрасте       */
/*  и размеры цели нажатия приходят оттуда.                                   */
/* -------------------------------------------------------------------------- */

/* --- Ссылки или кнопки ---------------------------------------------------- */
/*
 *  <Pagination page={page} total={20} href={p => `/товары?страница=${p}`}/>
 *
 *  Есть href — номера становятся ссылками: страницу можно открыть
 *  в соседней вкладке, скопировать её адрес, она видна поисковику
 *  и работает без JS. Нет href — обычные кнопки, для таблицы внутри
 *  диалога или вкладки, где адрес не меняется.
 *
 *  onChange приходит в обоих случаях. В режиме ссылок — перед переходом,
 *  и preventDefault() его отменяет: так роутер забирает навигацию себе,
 *  не теряя настоящего адреса в разметке.
 */

/* --- Выключенные стрелки -------------------------------------------------- */
/*
 *  На первой странице «назад» вести некуда, и в режиме ссылок стрелка
 *  становится выключенной кнопкой, а не ссылкой без адреса. Ссылка без
 *  href — не ссылка вовсе: она выпадает из дерева доступности и из
 *  табуляции, то есть просто исчезает, вместо того чтобы сказать
 *  «дальше некуда».
 */

/* --- Сколько номеров видно ------------------------------------------------ */
/*
 *  1 … 4 5 6 … 20 — края, многоточия и окно вокруг текущей. На узком
 *  месте окно становится на один номер уже, и это делает CSS, а не JS:
 *  лишние номера помечены data-near и прячутся по @container. Замеров
 *  ширины, наблюдателей и перерисовок на изменение размера нет.
 *
 *  Многоточие при этом не врёт. Разрыв, который появляется только после
 *  сокращения, отрисован заранее и помечен data-when="narrow" — CSS
 *  показывает его ровно тогда, когда соседние номера спрятаны.
 */
/* -------------------------------------------------------------------------- */

import {useId, type MouseEvent, type ReactNode} from 'react';
import {arrowIcon, doubleArrowIcon} from '../../assets/icons/icon.tsx';
import {Button} from '../Button/Button.tsx';
import type {PaginationLabels, PaginationProps} from './Pagination.interface.ts';
import styles from './Pagination.module.css';

const LABELS: PaginationLabels = {
    page: page => `Страница ${page}`,
    first: 'Первая страница',
    previous: 'Предыдущая страница',
    next: 'Следующая страница',
    last: 'Последняя страница',
    status: (page, total) => `Страница ${page} из ${total}`,
};

type Item =
    /* far — номер, который виден только на широком месте. */
    | {kind: 'page', page: number, far?: true}
    | {kind: 'gap', when: 'always' | 'narrow'};

/** Общее у всех кнопок пагинации: вид, имя, класс и пометка «вы здесь». */
type Common = {
    variant: 'INLINE' | 'OUTLINE',
    'aria-label': string,
    'aria-current'?: 'page',
    className: string,
};

function Pagination({
                        page,
                        total,
                        href,
                        onChange,
                        siblings = 2,
                        boundaries = 1,
                        arrows = true,
                        edges = true,
                        status = true,
                        label = 'Постраничная навигация',
                        labels,
                        className = '',
                        ...props
                    }: PaginationProps) {

    const statusId = useId();

    const words = {...LABELS, ...labels};
    /* Страница за пределами шкалы — не повод ломаться: подсвечиваем ту,
       что ближе всего к ней, а разрывы считаем от неё же. */
    const here = Math.min(Math.max(Math.round(page), 1), Math.max(total, 1));
    const items = build(here, total, siblings, boundaries);
    const text = typeof status === 'function' ? status(here, total) : words.status(here, total);

    /* Одна страница — навигации нет. Пустой <nav> остался бы в списке
       ориентиров и обещал переходы, которых не существует. */
    if (total < 2) return null;

    return (
        <nav
            {...props}
            aria-label={label}
            /* Надпись «Страница 3 из 20» объявляется вместе с именем
               ориентира: перейдя к навигации, слышно сразу, где ты. */
            aria-describedby={status === false ? props['aria-describedby'] : statusId}
            className={[styles.pagination, className].filter(Boolean).join(' ')}
        >
            {status !== false && <span id={statusId} className={styles.status}>{text}</span>}

            {/*
              * Список, а не просто ряд: скринридер объявит «список из
              * девяти элементов», и станет понятно, сколько здесь переходов
              * и где ты в них находишься.
              */}
            <ul className={styles.list}>
                {edges && (
                    <li className={styles.item}>
                        {step(1, words.first, styles.first, doubleArrowIcon)}
                    </li>
                )}
                {arrows && (
                    <li className={styles.item}>
                        {step(here - 1, words.previous, styles.previous, arrowIcon)}
                    </li>
                )}

                {items.map((item, index) => (
                    <li
                        key={item.kind === 'page' ? item.page : `gap-${index}`}
                        className={styles.item}
                        data-far={item.kind === 'page' && item.far ? '' : undefined}
                        data-when={item.kind === 'gap' ? item.when : undefined}
                    >
                        {item.kind === 'gap'
                            /* Многоточие читать незачем: пропуск уже слышен
                               по тому, что номера идут не подряд. */
                            ? <span className={styles.gap} aria-hidden="true">…</span>
                            : control(item.page, false, {
                                variant: item.page === here ? 'OUTLINE' : 'INLINE',
                                'aria-label': words.page(item.page),
                                'aria-current': item.page === here ? 'page' : undefined,
                                className: styles.page,
                            }, item.page)}
                    </li>
                ))}

                {arrows && (
                    <li className={styles.item}>
                        {step(here + 1, words.next, styles.next, arrowIcon)}
                    </li>
                )}
                {edges && (
                    <li className={styles.item}>
                        {step(total, words.last, styles.last, doubleArrowIcon)}
                    </li>
                )}
            </ul>
        </nav>
    );

    /*
     * Стрелка. Доступна, пока ведёт на другую страницу внутри шкалы;
     * иначе это выключенная кнопка — см. шапку о ссылках без адреса.
     */
    function step(to: number, name: string, turn: string, icon: ReactNode) {
        return control(to, to < 1 || to > total || to === here, {
            variant: 'INLINE',
            'aria-label': name,
            className: [styles.page, styles.arrow, turn].join(' '),
        }, <span className={styles.icon} aria-hidden="true">{icon}</span>);
    }

    /*
     * Одна кнопка пагинации. Три ветки, а не один Button с подмешанными
     * пропсами: тег и набор атрибутов у ссылки и у кнопки разные, и
     * полиморфный Button справедливо не принимает их объединение.
     *
     * Выключенная — всегда кнопка, даже в режиме ссылок: ссылка без
     * адреса не ссылка вовсе, она выпадает и из табуляции, и из дерева
     * доступности, то есть молча исчезает вместо «дальше некуда».
     */
    function control(to: number, off: boolean, common: Common, children: ReactNode) {
        const onClick = (event: MouseEvent<HTMLElement>) => pick(to, event);

        if (off) return <Button {...common} disabled onClick={onClick}>{children}</Button>;

        if (href !== undefined) {
            return <Button {...common} as="a" href={href(to)} onClick={onClick}>{children}</Button>;
        }

        return <Button {...common} onClick={onClick}>{children}</Button>;
    }

    function pick(to: number, event: MouseEvent<HTMLElement>) {
        if (to === here || to < 1 || to > total) {
            event.preventDefault();

            return;
        }

        onChange?.(to, event);
    }
}

/**
 * Что показать: края, окно вокруг текущей страницы и разрывы между ними.
 *
 * Возвращается сразу широкий набор; узкий из него получается скрытием
 * помеченных элементов, поэтому разрывы считаются дважды — для обоих
 * наборов. Разрыв, нужный только узкому, помечается, а не досчитывается
 * потом: иначе после скрытия номеров пропуск остался бы необъявленным.
 */
function build(page: number, total: number, siblings: number, boundaries: number): Item[] {
    const items: Item[] = [];
    const edge = Math.max(boundaries, 0);
    const wide = Math.max(siblings, 0);
    /*
     * Узкое окно — на один номер уже. Но не уже одного соседа: с нулём
     * от окна остаётся сама текущая страница, и по бокам от неё нечем
     * понять, куда ты попадёшь. Если соседа и так просили одного,
     * сокращать уже нечего — узкий набор равен широкому.
     */
    const narrow = wide > 1 ? wide - 1 : wide;
    const first = Math.min(edge, total);
    const last = total - edge + 1;

    const from = (span: number) => Math.max(first + 1, page - span);
    const to = (span: number) => Math.min(last - 1, page + span);

    for (let p = 1; p <= first; p++) items.push({kind: 'page', page: p});

    if (from(wide) > first + 1) items.push({kind: 'gap', when: 'always'});
    else if (from(narrow) > first + 1) items.push({kind: 'gap', when: 'narrow'});

    for (let p = from(wide); p <= to(wide); p++) {
        if (p <= first || p >= last) continue;

        /* За узким окном — значит на узком месте этот номер прячется. */
        const far = p < from(narrow) || p > to(narrow);

        items.push(far ? {kind: 'page', page: p, far} : {kind: 'page', page: p});
    }

    if (to(wide) < last - 1) items.push({kind: 'gap', when: 'always'});
    else if (to(narrow) < last - 1) items.push({kind: 'gap', when: 'narrow'});

    for (let p = Math.max(last, first + 1); p <= total; p++) items.push({kind: 'page', page: p});

    return items;
}

export {Pagination};
