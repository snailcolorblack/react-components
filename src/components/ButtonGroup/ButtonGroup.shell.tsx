// ButtonGroup.shell.tsx

/* -------------------------------------------------------------------------- */
/*  ОБОЛОЧКА ГРУППЫ                                                           */
/*                                                                            */
/*  Ряд кнопок с одной активной и индикатор под ней. Всё, что видно,          */
/*  живёт здесь; семантику приносит тот, кто оболочку использует:             */
/*                                                                            */
/*      ButtonGroup — fieldset с настоящими radio внутри,                     */
/*      Tabs.Buttons — role="tablist" с кнопками role="tab".                  */
/*                                                                            */
/*  Отсюда и общий тег через as: у вкладок это div с ролью, у группы          */
/*  переключателей — обычный блок внутри fieldset.                            */
/*                                                                            */
/*  Публичного экспорта у оболочки нет: снаружи берут ButtonGroup или Tabs,   */
/*  а не голую коробку без ролей.                                             */
/* -------------------------------------------------------------------------- */

/* --- Колесо мыши ----------------------------------------------------------- */
/*
 *  Полоса прокручивается вбок, а колесо у мыши одно — вертикальное.
 *  Без перехвата до дальних кнопок с обычной мышью не добраться: Chromium
 *  сам вертикальное колесо в горизонтальную прокрутку не переводит —
 *  замерено, полоса стоит на месте, уезжает страница.
 *
 *  Слушатель вешается руками и непассивным. Отменить прокрутку страницы
 *  можно только в непассивном, а React вешает wheel пассивно: замерено,
 *  с onWheel и preventDefault() страница всё равно уехала на 41px.
 *
 *  На краю полосы прокрутка отдаётся странице. Иначе это ловушка: колесо
 *  над полосой переставало бы листать страницу вовсе.
 */
/* -------------------------------------------------------------------------- */

import {useCallback, type ComponentPropsWithRef, type CSSProperties, type ElementType, type Ref} from 'react';
import type {ButtonGroupVariant} from './ButtonGroup.interface.ts';
import styles from './ButtonGroup.module.css';

const VARIANT_CLASS = {
    LINE: styles.line,
    PILL: styles.pill,
} satisfies Record<ButtonGroupVariant, string>;

/** Высота строки для deltaMode: колесо шлёт не только пиксели. */
const LINE_HEIGHT = 16;

type ShellProps<T extends ElementType> = {
    as?: T
    variant: ButtonGroupVariant
    /** Имя якоря для индикатора: своё на каждый экземпляр. */
    pill: string
} & Omit<ComponentPropsWithRef<T>, 'as'>;

function ButtonGroupShell<T extends ElementType = 'div'>({
                                                             as,
                                                             variant,
                                                             pill,
                                                             className = '',
                                                             style,
                                                             children,
                                                             ref,
                                                             ...props
                                                         }: ShellProps<T>) {
    /*
     * React 19 умеет убирать за ref-коллбэком по возвращённой функции,
     * поэтому отдельный useEffect под слушатель не нужен — и подписка,
     * и чужой ref живут в одном месте.
     */
    const attach = useCallback((node: HTMLElement | null) => {
        assign(ref as Ref<HTMLElement> | undefined, node);

        if (node === null) return;

        node.addEventListener('wheel', wheel, {passive: false});

        return () => {
            node.removeEventListener('wheel', wheel);
            assign(ref as Ref<HTMLElement> | undefined, null);
        };
    }, [ref]);

    const Component = (as ?? 'div') as ElementType;

    return (
        <Component
            {...props}
            ref={attach}
            className={[styles.group, VARIANT_CLASS[variant], className].filter(Boolean).join(' ')}
            style={{...style, '--group-pill': pill} as CSSProperties}
        >
            {/*
              * Индикатор лежит фоном под кнопками и к озвучке отношения
              * не имеет: состояние читается с самих кнопок. role="presentation"
              * нужен для вкладок — по ARIA у tablist в детях бывают только tab.
              */}
            <span className={styles.indicator} role="presentation" aria-hidden="true"/>

            {children}
        </Component>
    );
}

/* -------------------------------------------------------------------------- */
/*  Колесо                                                                    */
/* -------------------------------------------------------------------------- */

function wheel(event: WheelEvent) {
    const node = event.currentTarget as HTMLElement;
    const limit = node.scrollWidth - node.clientWidth;

    /* Прокручивать нечего — например, у вертикальной полосы. */
    if (limit < 1) return;
    /* Горизонтальный жест трекпада платформа разворачивает сама. */
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

    const step = pixels(event, node);
    const edge = step < 0 ? node.scrollLeft < 1 : limit - node.scrollLeft < 1;

    /* Дошли до края — пусть дальше листается страница, а не упирается. */
    if (edge) return;

    event.preventDefault();
    node.scrollLeft += step;
}

/** Колесо шлёт пиксели, строки или страницы — приводим к пикселям. */
function pixels(event: WheelEvent, node: HTMLElement) {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * LINE_HEIGHT;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * node.clientWidth;

    return event.deltaY;
}

/** Проставить чужой ref, каким бы он ни пришёл. */
function assign(ref: Ref<HTMLElement> | undefined, node: HTMLElement | null) {
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
}

export {ButtonGroupShell};
