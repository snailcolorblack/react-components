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
 *  Перехват живёт в ../Scroll/Scroll.wheel.ts: он же работает в ленте
 *  Scroll, и держать две копии одной тонкости незачем.
 */
/* -------------------------------------------------------------------------- */

import type {ComponentPropsWithRef, CSSProperties, ElementType} from 'react';
import {useWheel} from '../Scroll/Scroll.wheel.ts';
import type {ButtonGroupVariant} from './ButtonGroup.interface.ts';
import styles from './ButtonGroup.module.css';

const VARIANT_CLASS = {
    LINE: styles.line,
    PILL: styles.pill,
} satisfies Record<ButtonGroupVariant, string>;

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
    const attach = useWheel(ref as never);

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


/** Колесо шлёт пиксели, строки или страницы — приводим к пикселям. */

/** Проставить чужой ref, каким бы он ни пришёл. */

export {ButtonGroupShell};
