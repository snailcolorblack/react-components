// Breadcrumbs.tsx

/* -------------------------------------------------------------------------- */
/*  ХЛЕБНЫЕ КРОШКИ                                                            */
/*                                                                            */
/*  Путь от корня к текущей странице. <nav> со списком <ol>, а не ряд ссылок: */
/*  путь — ориентир, скринридер обязан находить его среди ориентиров, а        */
/*  порядок звеньев значим, поэтому список нумерованный.                      */
/*                                                                            */
/*  Последнее звено — не ссылка, а текст с aria-current="page". Ссылка на     */
/*  страницу, где человек уже стоит, обещает переход, которого нет; APG для   */
/*  breadcrumb рекомендует ровно это, а отдельного aria-состояния для «вы     */
/*  здесь» не существует — подменять его на aria-selected нельзя.             */
/* -------------------------------------------------------------------------- */

/* --- Разделитель ---------------------------------------------------------- */
/*
 *  Разделитель нарисован разметкой, а не content в CSS. Две причины,
 *  и обе замерены. Во-первых, content не копируется: путь, выделенный
 *  мышью, вставлялся бы как «ГлавнаяБанкСчета». Во-вторых, Chromium
 *  кладёт текст из ::before в дерево доступности — замерено через CDP,
 *  у ссылки с ::before { content: "/" } имя становится «Банк /».
 *  Отдельный <span aria-hidden> не попадает в имя и при этом копируется.
 */

/* --- Когда путь сворачивается --------------------------------------------- */
/*
 *  Решает проп collapse, и по умолчанию он отдан ширине.
 *
 *  'fit'  — середина уезжает под «…», только когда коробка стала тесной:
 *           ниже 40rem прячется середина, ниже 22rem — всё, кроме корня
 *           и текущей страницы. На широком месте путь виден целиком.
 *  число  — середина спрятана всегда, как только звеньев стало больше
 *           этого числа. Ширина при этом продолжает работать.
 *  false  — не сворачивать вовсе: ни по количеству, ни по ширине.
 *
 *  Три пометки на звеньях, по одной на каждый случай: data-cut —
 *  спрятано всегда, data-mid — пока тесно, data-far — пока совсем узко.
 *  Прячет их @container, а не JS: ни замеров ширины, ни наблюдателя,
 *  ни перерисовок при изменении размера.
 *
 *  Кнопка «…» во всех случаях одна и та же и помечена тем же порогом,
 *  с которого начинает что-то пропадать (data-when). Иначе путь терял
 *  бы середину молча.
 */

/* --- Почему раскрытие на месте, а не меню в поповере ----------------------- */
/*
 *  Замерено в Chromium 141, ширина 360px, путь из семи звеньев: раскрытый
 *  ряд занимает три строки и сдвигает содержимое под собой на 56px.
 *  Меню в поповере этого сдвига не даёт, но ложится поверх того же
 *  содержимого и уводит фокус в себя. Сдвиг виден и обратим вторым
 *  щелчком, перекрытие — нет. Плюс у кнопки с aria-expanded клавиатура
 *  и объявление состояния приходят от платформы, а меню их требует
 *  писать: роли, стрелки, возврат фокуса.
 */
/* -------------------------------------------------------------------------- */

import {Fragment, useState, type MouseEvent, type ReactNode} from 'react';
import {Button} from '../Button/Button.tsx';
import type {BreadcrumbsLabels, BreadcrumbsProps, Crumb} from './Breadcrumbs.interface.ts';
import styles from './Breadcrumbs.module.css';

const LABELS: BreadcrumbsLabels = {
    expand: 'Показать путь целиком',
    collapse: 'Свернуть путь',
};

function Breadcrumbs({
                         items,
                         collapse = 'fit',
                         head = 1,
                         tail = 2,
                         separator = '/',
                         label = 'Хлебные крошки',
                         labels,
                         onNavigate,
                         className = '',
                         ...props
                     }: BreadcrumbsProps) {

    const [open, setOpen] = useState(false);

    const words = {...LABELS, ...labels};
    const total = items.length;
    /* Считает ли проп звенья или оставляет решать ширине. */
    const byCount = typeof collapse === 'number';
    /*
     * Середина — один и тот же полуинтервал [from, to) в обоих режимах.
     * Разница только в том, когда она прячется: по количеству — всегда,
     * по ширине — когда места перестало хватать.
     */
    const {from, to} = collapse === false
        ? {from: 0, to: 0}
        : plan(total, byCount ? collapse : head + tail, head, tail);
    const cut = to > from;
    const mid = (index: number) => cut && index >= from && index < to;
    /*
     * Совсем на узком месте остаются только первое и текущее звено.
     * Всё, что между ними и не попало в середину, — пометка data-far.
     */
    const far = (index: number) => collapse !== false
        && !mid(index) && index !== 0 && index !== total - 1;
    /* Кнопка стоит там, где начинается спрятанное. */
    const gap = cut ? from : items.findIndex((_, index) => far(index));

    if (total === 0) return null;

    return (
        <nav
            {...props}
            aria-label={label}
            /* Раскрытие — на коробке, а не на каждом звене: правилу CSS
               так достаточно одного признака, а звенья остаются теми же. */
            data-open={open ? '' : undefined}
            className={[styles.breadcrumbs, className].filter(Boolean).join(' ')}
        >
            <ol className={styles.list}>
                {items.map((item, index) => (
                    <Fragment key={index}>
                        {index === gap && gap > 0 && (
                            <li
                                className={styles.item}
                                /*
                                 * Кнопка появляется вместе с первым
                                 * спрятанным звеном: прячет число —
                                 * видна всегда, прячет ширина — с её
                                 * порога. Иначе путь либо терял бы
                                 * середину молча, либо обещал бы
                                 * спрятанное там, где всё на виду.
                                 */
                                data-when={cut ? (byCount ? undefined : 'mid') : 'narrow'}
                            >
                                <Button
                                    variant="INLINE"
                                    className={[styles.link, styles.more].join(' ')}
                                    aria-expanded={open}
                                    aria-label={open ? words.collapse : words.expand}
                                    onClick={() => setOpen(was => !was)}
                                >
                                    <span aria-hidden="true">…</span>
                                </Button>
                                {mark()}
                            </li>
                        )}

                        <li
                            className={styles.item}
                            /* Спрятано всегда: так попросили числом. */
                            data-cut={byCount && mid(index) ? '' : undefined}
                            /* Спрятано, когда коробка стала тесной. */
                            data-mid={!byCount && mid(index) ? '' : undefined}
                            /* Спрятано, когда коробка стала совсем узкой. */
                            data-far={far(index) ? '' : undefined}
                        >
                            {crumb(item, index)}
                            {index < total - 1 && mark()}
                        </li>
                    </Fragment>
                ))}
            </ol>
        </nav>
    );

    /*
     * Одно звено. Три вида, и разница не в оформлении: текущая страница —
     * текст, звено с адресом — ссылка, звено без адреса — тоже текст.
     * Ссылка без href из дерева доступности и из табуляции выпадает,
     * то есть молча исчезает, а не говорит «сюда перейти нельзя».
     */
    function crumb(item: Crumb, index: number) {
        const inside = (
            <>
                {item.icon !== undefined && (
                    <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                )}
                <span className={styles.label}>{item.label}</span>
            </>
        );

        if (index === total - 1) {
            return (
                <span
                    className={[styles.text, styles.current].join(' ')}
                    aria-label={item['aria-label']}
                    aria-current="page"
                >
                    {inside}
                </span>
            );
        }

        if (item.href === undefined) {
            return <span className={styles.text} aria-label={item['aria-label']}>{inside}</span>;
        }

        return (
            <Button
                as="a"
                variant="INLINE"
                href={item.href}
                aria-label={item['aria-label']}
                className={styles.link}
                onClick={(event: MouseEvent<HTMLElement>) => onNavigate?.(item, index, event)}
            >
                {inside}
            </Button>
        );
    }

    /* Разделитель. Для скринридера его нет: пауза между ссылками слышна. */
    function mark(): ReactNode {
        return <span className={styles.separator} aria-hidden="true">{separator}</span>;
    }
}

/**
 * Какая часть пути считается серединой: полуинтервал [from, to).
 *
 * Прячется именно она, края остаются: начало говорит, где корень,
 * конец — где ты сейчас. Пустой интервал значит «сворачивать нечего»,
 * и кнопки «…» не будет вовсе.
 */
function plan(total: number, max: number, head: number, tail: number) {
    /*
     * Прятать имеет смысл, только если спрятанного больше одного:
     * «…» на месте единственного звена занимает столько же места,
     * сколько само звено, и ничего не выигрывает.
     */
    const keepHead = Math.max(Math.min(head, total), 0);
    const keepTail = Math.max(Math.min(tail, total - keepHead), 1);
    const from = keepHead;
    const to = total - keepTail;

    if (total <= max || to - from < 2) return {from: 0, to: 0};

    return {from, to};
}

export {Breadcrumbs};
