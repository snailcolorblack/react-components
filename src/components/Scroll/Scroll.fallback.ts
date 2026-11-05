/* -------------------------------------------------------------------------- */
/*  Растушёвка и стрелки там, где CSS этого не умеет                          */
/*                                                                            */
/*  Основной путь — платформа: animation-timeline: scroll() ведёт растушёвку, */
/*  ::scroll-button() рисует стрелки, и в поддерживающем движке этот хук      */
/*  ни на что не подписывается. Scroll-driven анимаций нет в Firefox < 159,   */
/*  а ::scroll-button() есть только в Chromium, и лента со спрятанной         */
/*  полосой оставалась бы там без единого признака прокрутки.                 */
/*                                                                            */
/*  Хук пишет в те же --scroll-fade-start и --scroll-fade-end, что и          */
/*  ключевые кадры: маска одна на оба пути, а настройка остаётся в CSS.       */
/* -------------------------------------------------------------------------- */

import {useEffect, useState, type RefObject} from 'react';

const supports = (test: (css: typeof CSS) => boolean) =>
    typeof CSS === 'undefined' || !CSS.supports || test(CSS);

const NATIVE_FADE = supports(css => css.supports('animation-timeline', 'scroll()'));
const NATIVE_ARROWS = supports(css => css.supports('selector(::scroll-button(*))'));

type Edges = {start: boolean, end: boolean, startLabel: string, endLabel: string};

/* Подписи живут в CSS (их читает и ::scroll-button()), поэтому берутся оттуда же. */
function label(style: CSSStyleDeclaration, name: string, fallback: string) {
    return style.getPropertyValue(name).trim().replace(/^['"]|['"]$/g, '') || fallback;
}

function useScrollFallback(
    nodeRef: RefObject<HTMLElement | null>,
    axis: 'inline' | 'block',
    fade: boolean,
    arrows: boolean,
) {
    const [edges, setEdges] = useState<Edges>({start: true, end: false, startLabel: 'Назад', endLabel: 'Вперёд'});

    const needFade = fade && !NATIVE_FADE;
    const needArrows = arrows && !NATIVE_ARROWS;

    useEffect(() => {
        const node = nodeRef.current;

        if (node === null || !(needFade || needArrows)) return;

        function update() {
            const box = node as HTMLElement;
            /* abs: в письме справа налево scrollLeft отрицательный. */
            const passed = Math.abs(axis === 'block' ? box.scrollTop : box.scrollLeft);
            const total = axis === 'block'
                ? box.scrollHeight - box.clientHeight
                : box.scrollWidth - box.clientWidth;
            const left = Math.max(0, total - passed);

            if (needFade) {
                /* @property --scroll-fade типа <length>: вычисленное значение уже в px. */
                const width = parseFloat(getComputedStyle(box).getPropertyValue('--scroll-fade')) || 1;

                box.style.setProperty('--scroll-fade-start', String(1 - Math.min(passed / width, 1)));
                box.style.setProperty('--scroll-fade-end', String(1 - Math.min(left / width, 1)));
            }

            if (needArrows) {
                /* Полпикселя запаса: дробный масштаб не даёт дойти до конца ровно. */
                const start = passed <= 0.5;
                const end = left <= 0.5;

                const style = getComputedStyle(box);
                const startLabel = label(style, '--scroll-arrow-start-label', 'Назад');
                const endLabel = label(style, '--scroll-arrow-end-label', 'Вперёд');

                setEdges(now => (
                    now.start === start && now.end === end
                    && now.startLabel === startLabel && now.endLabel === endLabel
                        ? now
                        : {start, end, startLabel, endLabel}
                ));
            }
        }

        update();
        node.addEventListener('scroll', update, {passive: true});

        const observer = new ResizeObserver(update);

        observer.observe(node);

        return () => {
            node.removeEventListener('scroll', update);
            observer.disconnect();
        };
    }, [nodeRef, axis, needFade, needArrows]);

    return {edges, needArrows};
}

/* Листает почти на экран, как ::scroll-button(). scrollBy, а не свои расчёты:
   привязка и scroll-behavior применяются как к любой другой прокрутке. */
function page(node: HTMLElement, axis: 'inline' | 'block', direction: 1 | -1) {
    if (axis === 'block') {
        node.scrollBy({top: node.clientHeight * 0.85 * direction});

        return;
    }

    const flow = getComputedStyle(node).direction === 'rtl' ? -1 : 1;

    node.scrollBy({left: node.clientWidth * 0.85 * direction * flow});
}

export {page, useScrollFallback};
