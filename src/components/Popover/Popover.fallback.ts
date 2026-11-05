/* -------------------------------------------------------------------------- */
/*  Привязка к триггеру там, где нет anchor positioning                       */
/*                                                                            */
/*  Основной путь — CSS, и в движках с поддержкой этот файл не делает ничего: */
/*  ни одного обработчика не вешается. Без поддержки (Chrome < 129,           */
/*  Firefox < 147, Safari < 26) поповер встал бы по центру экрана,            */
/*  а подсказка оторвалась бы от своей кнопки.                                */
/*                                                                            */
/*  Считать здесь приходится только то, чего CSS без якоря не знает: где      */
/*  триггер и с какой стороны есть место. Зазор, отступы и ширина остаются    */
/*  в стилях компонента: JS отдаёт координаты переменными --anchor-*.         */
/*                                                                            */
/*  Слушатель один на документ, а не на компонент: toggle не всплывает,       */
/*  но ловится на перехвате. Кому нужна привязка, видно по --popover-area     */
/*  или --tooltip-area на самом элементе, поэтому чужие поповеры и <details>  */
/*  (у него то же событие) сюда не попадают.                                  */
/* -------------------------------------------------------------------------- */

const NATIVE = typeof document === 'undefined'
    || typeof CSS === 'undefined'
    || !CSS.supports
    || CSS.supports('position-area', 'block-end');

/* Поле до края экрана, когда окно упирается в него поперёк оси раскрытия. */
const EDGE = 8;

const opened = new Set<HTMLElement>();

function areaOf(popup: HTMLElement) {
    return popup.style.getPropertyValue('--popover-area') || popup.style.getPropertyValue('--tooltip-area');
}

function anchorOf(popup: HTMLElement) {
    const name = popup.style.getPropertyValue('--popover-anchor');
    const named = name ? document.querySelector(`[data-anchor-name="${name}"]`) : null;

    return named ?? document.querySelector(
        `[popovertarget="${popup.id}"], [commandfor="${popup.id}"], `
        + `[aria-describedby~="${popup.id}"], [aria-labelledby~="${popup.id}"]`,
    );
}

function clamp(start: number, size: number, room: number) {
    return Math.max(EDGE, Math.min(start, room - size - EDGE));
}

function place(popup: HTMLElement) {
    const anchor = anchorOf(popup)?.getBoundingClientRect();

    if (anchor === undefined) return;

    popup.style.setProperty('--anchor-width', `${anchor.width}px`);

    /* offset*, а не getBoundingClientRect: окно в этот момент ещё в анимации
       появления, и его масштаб занизил бы размер. */
    const {offsetWidth: width, offsetHeight: height} = popup;
    const [wanted] = areaOf(popup).split(' ');
    /* Сбоку не влезает ни с одной стороны — под кнопку, как и CSS-путь на узком экране. */
    const side = wanted.startsWith('inline')
        && anchor.right + width + EDGE > innerWidth
        && anchor.left - width - EDGE < 0
        ? 'block-end'
        : wanted;

    let x;
    let y;
    let signX = 0;
    let signY = 0;

    if (side.startsWith('block')) {
        const after = anchor.bottom + height + EDGE <= innerHeight;
        const before = anchor.top - height - EDGE >= 0;
        const below = side === 'block-end' ? after || !before : !before && after;

        x = clamp(anchor.left, width, innerWidth);

        if (after || before) {
            signY = below ? 1 : -1;
            y = below ? anchor.bottom : anchor.top - height;
        } else {
            /* Не влезает ни сверху, ни снизу: на всю высоту, прокрутку даст само окно. */
            y = clamp(anchor.bottom, height, innerHeight);
        }
    } else {
        const after = anchor.right + width + EDGE <= innerWidth;
        const before = anchor.left - width - EDGE >= 0;
        const right = side === 'inline-end' ? after || !before : !before && after;

        signX = right ? 1 : -1;
        x = right ? anchor.right : anchor.left - width;
        y = clamp(anchor.top, height, innerHeight);
    }

    popup.style.setProperty('--anchor-x', `${x}px`);
    popup.style.setProperty('--anchor-y', `${y}px`);
    popup.style.setProperty('--anchor-sign-x', String(signX));
    popup.style.setProperty('--anchor-sign-y', String(signY));
}

if (!NATIVE) {
    document.addEventListener('toggle', event => {
        const popup = event.target as HTMLElement;

        if (!popup.matches('[popover]') || !areaOf(popup)) return;

        if ((event as ToggleEvent).newState === 'open') {
            opened.add(popup);
            place(popup);
        } else {
            opened.delete(popup);
        }
    }, true);

    const follow = () => opened.forEach(place);

    addEventListener('scroll', follow, {capture: true, passive: true});
    addEventListener('resize', follow);
}

export {};
