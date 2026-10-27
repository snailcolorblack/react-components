// Scroll.wheel.ts

/* -------------------------------------------------------------------------- */
/*  КОЛЕСО НАД ЛЕНТОЙ                                                         */
/*                                                                            */
/*  Лента прокручивается вбок, а колесо у мыши одно — вертикальное. Без       */
/*  перехвата до дальних карточек с обычной мышью не добраться: Chromium      */
/*  сам вертикальное колесо в горизонтальную прокрутку не переводит —         */
/*  замерено, лента стоит на месте, уезжает страница.                         */
/*                                                                            */
/*  Слушатель вешается руками и непассивным: отменить прокрутку страницы      */
/*  можно только в непассивном, а React вешает wheel пассивно — замерено,     */
/*  с onWheel и preventDefault() страница всё равно уехала на 41px.           */
/*                                                                            */
/*  Настройки читаются не из замыкания, а из data-атрибутов самого узла.      */
/*  Так обработчик остаётся один на все ленты и не перевешивается при         */
/*  каждой смене пропа — те же атрибуты всё равно нужны разметке для CSS.     */
/* -------------------------------------------------------------------------- */

import {useCallback, type Ref} from 'react';

/** Высота строки для deltaMode: колесо шлёт не только пиксели. */
const LINE_HEIGHT = 16;
/** Сколько ждём продолжения жеста, прежде чем считать прокрутку с нуля. */
const GESTURE_LIFE = 300;
/*
 * Сколько едет лента до новой цели. Коротко нарочно: это не украшение,
 * а связь движения руки с движением на экране. Замерено, почему своя
 * анимация, а не scroll-behavior: у smooth лента трогалась через 33мс
 * и доезжала за 200мс — заметно позади руки; у auto движение мгновенное,
 * то есть рывком. Ни того, ни другого в CSS не настроить: длительности
 * у scroll-behavior нет.
 */
const GLIDE = 140;

/*
 * Куда лента едет прямо сейчас. Свободной прокрутке эта память не нужна —
 * она мгновенная, — а вот шагам по элементам нужна: они анимированы,
 * и без неё быстрые щелчки колеса считались бы от ещё не доехавшего
 * положения, а не от того, куда лента уже направляется.
 */
const AIM = new WeakMap<HTMLElement, {
    at: number,
    left: number,
    index: number,
    from?: number,
    start?: number,
    raf?: number,
}>();

export function useWheel(ref?: Ref<HTMLElement>) {
    return useCallback((node: HTMLElement | null) => {
        assign(ref, node);

        if (node === null) return;

        node.addEventListener('wheel', wheel, {passive: false});

        return () => {
            node.removeEventListener('wheel', wheel);
            assign(ref, null);
        };
    }, [ref]);
}

function wheel(event: WheelEvent) {
    const node = event.currentTarget as HTMLElement;

    /* Вертикальную ленту колесо листает само — вмешиваться не во что. */
    if (node.dataset.axis === 'block') return;

    const limit = node.scrollWidth - node.clientWidth;

    /* Прокручивать нечего: содержимое помещается целиком. */
    if (limit < 1) return;
    /* Горизонтальный жест трекпада платформа разворачивает сама. */
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

    const forward = event.deltaY > 0;
    const edge = forward ? limit - Math.abs(node.scrollLeft) < 1 : Math.abs(node.scrollLeft) < 1;

    /*
     * На краю прокрутка отдаётся странице, если лента не держит её сама.
     * Иначе широкая лента становится ловушкой: колесо над ней перестаёт
     * листать страницу вовсе.
     */
    if (edge && node.dataset.trap === undefined) return;

    event.preventDefault();

    if (node.dataset.mode === 'fixed') snap(node, forward);
    else free(node, pixels(event, node));
}

/**
 * Свободная прокрутка: лента едет на столько, на сколько повернули колесо.
 *
 * Каждый щелчок не начинает анимацию заново с нуля, а переносит цель:
 * лента трогается в тот же кадр и за GLIDE миллисекунд приходит туда,
 * где должна быть с учётом всех щелчков. Поэтому быстрая прокрутка
 * не отстаёт и не недокручивает — конечное место равно сумме щелчков
 * до пикселя (замерено).
 *
 * Кому движение противопоказано, тому его и нет: при prefers-reduced-motion
 * лента переносится сразу.
 */
function free(node: HTMLElement, step: number) {
    const limit = node.scrollWidth - node.clientWidth;
    /* В арабской вёрстке прокрутка идёт в минус: предел с другой стороны. */
    const rtl = getComputedStyle(node).direction === 'rtl';
    const aim = AIM.get(node);
    const now = performance.now();
    const from = aim !== undefined && now - aim.at < GESTURE_LIFE ? aim.left : node.scrollLeft;
    const left = Math.min(Math.max(from + step, rtl ? -limit : 0), rtl ? 0 : limit);

    if (aim?.raf !== undefined) cancelAnimationFrame(aim.raf);

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        AIM.set(node, {at: now, left, index: -1});
        node.scrollTo({left, behavior: 'instant'});

        return;
    }

    AIM.set(node, {at: now, left, index: -1, from: node.scrollLeft, start: now, raf: requestAnimationFrame(() => glide(node))});
}

/*
 * Один шаг анимации. Отсчёт ведётся от того места, где лента была в момент
 * последнего щелчка, поэтому новый щелчок посреди движения не дёргает
 * её назад: меняется только цель, а поехала она уже.
 */
function glide(node: HTMLElement) {
    const aim = AIM.get(node);

    if (aim?.from === undefined || aim.start === undefined) return;

    const part = Math.min((performance.now() - aim.start) / GLIDE, 1);
    /* Замедление к концу: резкий обрыв движения читается как рывок. */
    const eased = 1 - (1 - part) ** 3;

    node.scrollTo({left: aim.from + (aim.left - aim.from) * eased, behavior: 'instant'});

    if (part < 1) AIM.set(node, {...aim, raf: requestAnimationFrame(() => glide(node))});
    else AIM.set(node, {...aim, raf: undefined});
}

/**
 * Прокрутка с привязкой: один щелчок колеса — один элемент.
 *
 * Место считает scrollIntoView, а не арифметика: он один знает и про
 * scroll-padding, и про направление письма. Замерено — в RTL лента едет
 * в свою сторону без единой поправки в коде.
 */
function snap(node: HTMLElement, forward: boolean) {
    const items = Array.from(node.children) as HTMLElement[];

    if (items.length === 0) return;

    const aim = AIM.get(node);
    const here = aim !== undefined && aim.index >= 0 && Date.now() - aim.at < GESTURE_LIFE
        ? aim.index
        : nearest(node, items);
    const index = Math.min(Math.max(here + (forward ? 1 : -1), 0), items.length - 1);

    AIM.set(node, {at: Date.now(), left: node.scrollLeft, index});
    items[index].scrollIntoView({block: 'nearest', inline: 'start', behavior: 'smooth'});
}

/**
 * Элемент, чьё начало ближе всего к началу видимой части ленты.
 *
 * Смотрим ровно на начальный край, и только на него: scroll-snap-align: start
 * обещает, что лента стоит именно началом элемента у начала ленты. Пока
 * в расчёт шёл и дальний край, ближайшим оказывался элемент, прижатый
 * к правому краю окна, — замерено, один щелчок колеса переносил на три
 * элемента вперёд (144 → 624 → 1104 при шаге 160).
 *
 * Начало зависит от направления письма: в арабской вёрстке это правый край.
 */
function nearest(node: HTMLElement, items: HTMLElement[]) {
    const rtl = getComputedStyle(node).direction === 'rtl';
    const edge = (rect: DOMRect) => rtl ? rect.right : rect.left;
    const start = edge(node.getBoundingClientRect());
    let best = 0;
    let least = Infinity;

    for (const [index, item] of items.entries()) {
        const away = Math.abs(edge(item.getBoundingClientRect()) - start);

        if (away < least) {
            least = away;
            best = index;
        }
    }

    return best;
}

function pixels(event: WheelEvent, node: HTMLElement) {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * LINE_HEIGHT;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * node.clientWidth;

    return event.deltaY;
}

function assign(ref: Ref<HTMLElement> | undefined, node: HTMLElement | null) {
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
}
