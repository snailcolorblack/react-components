// Scroll.tsx

/* -------------------------------------------------------------------------- */
/*  ЛЕНТА С ПРОКРУТКОЙ                                                        */
/*                                                                            */
/*  Это обычный блок с overflow, а не виджет. Прокрутку, инерцию, полосу,     */
/*  жесты трекпада и пальца, клавиши, привязку к элементам и перенос фокуса   */
/*  делает браузер. Нашего здесь ровно две вещи, и обе — потому что           */
/*  платформа их не делает:                                                   */
/*                                                                            */
/*      колесо: Chromium не переводит вертикальное колесо в горизонтальную    */
/*      прокрутку (замерено — лента стоит, уезжает страница);                 */
/*                                                                            */
/*      табуляция: до прокручиваемой области без фокусируемого содержимого    */
/*      с клавиатуры не добраться, а Chromium, в отличие от Firefox,          */
/*      сам её остановкой не делает.                                          */
/* -------------------------------------------------------------------------- */

/* --- Почему tabindex ставится не всегда ------------------------------------ */
/*
 *  Лента из карточек-ссылок уже доступна: Tab ведёт по карточкам, а лента
 *  едет за фокусом сама. Лишняя остановка на самой ленте в такой раскладке
 *  только удлиняет путь.
 *
 *  Лента из картинок или текста — другое дело: внутри останавливаться не
 *  на чем, и без tabindex её содержимое для клавиатуры просто не
 *  существует. Поэтому смотрим на содержимое и решаем по нему.
 *
 *  Заодно появляется роль: замерено, <div> с aria-label и без роли
 *  в дерево доступности не попадает вовсе — имя теряется. Тег со своей
 *  ролью (ul, section) обходится своей.
 */
/* -------------------------------------------------------------------------- */

import {useCallback, useLayoutEffect, useRef, useState, type ElementType, type Ref} from 'react';
import {useWheel} from './Scroll.wheel.ts';
import type {ScrollProps} from './Scroll.interface.ts';
import styles from './Scroll.module.css';

/* Что считается «до этого можно дойти табуляцией». */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), '
    + '[contenteditable]:not([contenteditable="false"]), audio[controls], video[controls], details';
/* Теги, у которых своей роли нет и её приходится давать. */
const ROLELESS = new Set(['div', 'span']);

function Scroll<T extends ElementType = 'div'>({
                                                   as,
                                                   axis = 'inline',
                                                   mode = 'smooth',
                                                   label,
                                                   trap = false,
                                                   fade = false,
                                                   arrows = false,
                                                   bleed = false,
                                                   bar = true,
                                                   className = '',
                                                   children,
                                                   ref,
                                                   ...props
                                               }: ScrollProps<T>) {

    /*
     * Нужна ли лента в табуляции, знает только разметка, и узнать это
     * можно лишь после отрисовки. Состояние меняется один раз на набор
     * детей — не на прокрутку.
     */
    const [standalone, setStandalone] = useState(false);
    const nodeRef = useRef<HTMLElement>(null);
    /*
     * Узел нужен двоим: обработчику колеса и нам — посмотреть, есть ли
     * внутри фокусируемое. Поэтому ref раздваивается, а чужой проходит
     * насквозь: иначе ссылка снаружи молча оставалась бы пустой
     * (поймано тестом).
     */
    const fanout = useCallback((node: HTMLElement | null) => {
        nodeRef.current = node;

        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as {current: HTMLElement | null}).current = node;
    }, [ref]);
    const attach = useWheel(fanout as Ref<HTMLElement>);

    const Component = (as ?? 'div') as ElementType;
    const tag = typeof Component === 'string' ? Component : '';
    /*
     * Пропсы полиморфного компонента типизированы через generic, и достать
     * из них конкретный ключ напрямую TypeScript не даёт. Приведение здесь
     * одно и на все три: своё решение по роли, имени и табуляции компонент
     * принимает, только если снаружи ничего не передали.
     */
    const given = props as {role?: string, tabIndex?: number, 'aria-label'?: string};

    useLayoutEffect(() => {
        const node = nodeRef.current;

        if (node === null) return;

        setStandalone(node.querySelector(FOCUSABLE) === null);
    }, [children]);

    /*
     * Отступ родителя, за который лента выходит. Снимается один раз
     * и записывается переменной — наблюдателя за размером нет намеренно:
     * он считал бы на каждое изменение ширины, а отступ меняется редко.
     * Там, где он всё же меняется по медиавыражению, значение передают
     * строкой, и тогда замера не происходит вовсе.
     */
    useLayoutEffect(() => {
        const node = nodeRef.current;

        if (node === null || bleed === false) return;
        if (typeof bleed === 'string') {
            node.style.setProperty('--scroll-bleed', bleed);

            return;
        }

        const parent = node.parentElement;

        if (parent === null) return;

        const style = getComputedStyle(parent);
        /*
         * Сторона выбирается физическая, с поправкой на направление письма:
         * в горизонтальной вёрстке это ровно то же, что paddingInlineStart,
         * но логические свойства умеет не всякая среда — jsdom на них
         * отвечает нулём, и правило молча переставало работать (поймано
         * тестом). В браузере оба пути дают одно и то же, замерено
         * и слева направо, и справа налево.
         */
        const padding = axis === 'block'
            ? style.paddingTop
            : style.direction === 'rtl' ? style.paddingRight : style.paddingLeft;

        node.style.setProperty('--scroll-bleed', padding);
    }, [axis, bleed, children]);

    return (
        <Component
            {...props}
            ref={attach}
            /*
             * Эти же атрибуты читает обработчик колеса: так он остаётся
             * один на все ленты и не перевешивается при смене пропа.
             */
            data-axis={axis}
            data-mode={mode}
            data-trap={trap || undefined}
            data-fade={fade || undefined}
            data-arrows={arrows || undefined}
            data-bleed={bleed === false ? undefined : ''}
            data-bar={bar ? undefined : 'none'}
            tabIndex={standalone ? (given.tabIndex ?? 0) : given.tabIndex}
            role={standalone && ROLELESS.has(tag) ? (given.role ?? 'group') : given.role}
            aria-label={label === undefined ? given['aria-label'] : String(label)}
            className={[styles.scroll, className].filter(Boolean).join(' ')}
        >
            {children}
        </Component>
    );
}

export {Scroll};
