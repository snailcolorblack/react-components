// Drawer.tsx

/* -------------------------------------------------------------------------- */
/*  ВЫЕЗЖАЮЩАЯ ПАНЕЛЬ                                                         */
/*                                                                            */
/*  Модальное окно, прижатое к краю экрана. Под ним <dialog> с showModal(),   */
/*  поэтому слой поверх всего, затемнение ::backdrop, ловушка фокуса, Esc     */
/*  и возврат фокуса на триггер приходят от браузера.                         */
/* -------------------------------------------------------------------------- */

/* --- Почему Dialog, а не свой блок ----------------------------------------- */
/*
 *  Панель перекрывает страницу, и всё, что под ней, обязано перестать
 *  существовать для фокуса, нажатий и скринридера. Своими силами это
 *  три механизма: inert на остальном дереве, перехват Tab и свой Esc.
 *  У <dialog> в модальном режиме они уже есть, и ошибиться там негде.
 */

/* --- Выезд и уход ---------------------------------------------------------- */
/*
 *  Анимация целиком на CSS: @starting-style даёт кадр до показа,
 *  а transition-behavior: allow-discrete у display и overlay держит
 *  окно в слое, пока оно уезжает. Поэтому ни таймеров, ни состояния
 *  «закрывается» здесь нет.
 */

/* --- Ступени и перетаскивание ---------------------------------------------- */
/*
 *  Ступень — это просто размер панели: он уходит в --drawer-size.
 *  Палец двигает --drawer-drag, и пока палец на экране, переход снят —
 *  иначе панель догоняла бы его с задержкой.
 *
 *  Тянуть можно за ручку всегда, а за само содержимое — только когда
 *  оно прокручено к началу: иначе жест спорил бы с прокруткой списка.
 *  Арифметика жеста вынесена в Drawer.drag.ts, здесь остаются события.
 */
/* -------------------------------------------------------------------------- */

import {useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointer} from 'react';
import {Dialog} from '../Dialog/Dialog.tsx';
import {settle, shift} from './Drawer.drag.ts';
import type {DragAxis} from './Drawer.drag.ts';
import type {DrawerLabels, DrawerProps, DrawerSide} from './Drawer.interface.ts';
import styles from './Drawer.module.css';

const LABELS: DrawerLabels = {
    handle: 'Размер панели',
    hint: 'Стрелки меняют размер, Esc закрывает',
};

/* По какой оси едет панель и в какую сторону растёт закрытие. */
const AXIS: Record<DrawerSide, {axis: DragAxis, sign: 1 | -1}> = {
    bottom: {axis: 'block', sign: 1},
    top: {axis: 'block', sign: -1},
    start: {axis: 'inline', sign: -1},
    end: {axis: 'inline', sign: 1},
};

function Drawer({
                    open,
                    onClose,
                    side = 'bottom',
                    variant = 'HANDLE',
                    snap = ['auto'],
                    defaultSnap = 0,
                    onSnapChange,
                    drag = 'touch',
                    label,
                    labels,
                    className = '',
                    style,
                    children,
                    ...props
                }: DrawerProps) {

    const [step, setStep] = useState(Math.min(Math.max(defaultSnap, 0), snap.length - 1));
    const panelRef = useRef<HTMLDialogElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    /* Живые данные жеста: во время движения они меняются каждый кадр,
       и перерисовывать на это React незачем — панель двигает CSS. */
    const gesture = useRef<{from: number, time: number, distance: number} | null>(null);
    /*
     * Было ли перетаскивание. После отпускания браузер шлёт ещё и click —
     * замерено: он доходил до обработчика ручки и тут же возвращал
     * ступень назад, поэтому жест вверх не срабатывал вовсе.
     */
    const dragged = useRef(false);

    const words = {...LABELS, ...labels};
    const {axis, sign} = AXIS[side];
    const classes = [styles.drawer, className].filter(Boolean).join(' ');
    const size = length(snap[Math.min(step, snap.length - 1)] ?? 'auto');
    /*
     * Ход панели — самая большая ступень, то есть последняя. Панель
     * такого роста с первого кадра, а текущая ступень выражается
     * отступом покоя: панель опущена за край ровно на разницу.
     * Так жест вытягивает уже разложенное содержимое, край не
     * отрывается, а на отпускании меняется только сдвиг.
     *
     * Ступень auto (размер по содержимому) в арифметику не годится:
     * calc(auto - auto) невычислим. Там остаётся прежний порядок —
     * панель ростом в ступень. Для одной ступени это и не нужно:
     * тянуть между ступенями всё равно не между чем.
     */
    const steps = snap.map(length);
    const measured = snap.length > 1 && steps.every(one => one !== 'auto');
    const full = measured ? steps[steps.length - 1] : undefined;
    const vars = {
        ...style,
        '--drawer-size': size,
        '--drawer-full': full,
        '--drawer-rest': full === undefined || full === size ? undefined : `calc(${full} - ${size})`,
        /*
         * «Во весь экран» обязано значить именно это. Обычному ходу
         * предел --drawer-max: 90dvh нужен — он оставляет полоску, по
         * которой видно, что под панелью страница, и куда можно нажать,
         * чтобы закрыть. Для full он же оказывался потолком: замерено
         * в Chromium 141, окно 800px — панель вставала в 720px, сверху
         * оставалась пустая полоса в 80px, и список выглядел обрезанным.
         * Смотрим на ход панели, а не на текущую ступень: ростом она
         * теперь всегда в самую большую.
         */
        '--drawer-max': (full ?? size) === '100%' ? '100%' : undefined,
    } as CSSProperties;

    return (
        <Dialog
            {...props}
            ref={panelRef}
            open={open}
            onClose={close}
            label={label}
            closedBy="any"
            data-side={side}
            data-variant={variant}
            /*
             * Панель стоит не на самой большой ступени: часть её роста
             * ниже края экрана. Прокрутка содержимого там запрещена —
             * иначе список уезжал бы в невидимую часть. Замерено
             * в Chromium 141, окно 800px, ступень 40vh: прокрутка тела
             * до конца уводила последнюю строку на 1240…1264, то есть
             * за экран. Сначала панель поднимают, потом листают.
             */
            data-partial={measured && step < snap.length - 1 ? '' : undefined}
            className={classes}
            style={vars}
        >
            {variant === 'HANDLE' && (
                <button
                    type="button"
                    className={styles.handle}
                    aria-label={words.handle}
                    title={words.hint}
                    onPointerDown={startDrag}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onKeyDown={handleKeys}
                    onClick={handleClick}
                >
                    <span className={styles.bar} aria-hidden="true"/>
                </button>
            )}

            <div
                ref={bodyRef}
                className={styles.body}
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                {children}
            </div>
        </Dialog>
    );

    /*
     * Закрытие — одно на все пути: своя кнопка, Esc, щелчок мимо
     * и жест вниз приходят сюда же. Здесь же ступень возвращается
     * к начальной: следующее открытие не должно помнить, до чего
     * панель дотянули в прошлый раз.
     */
    function close() {
        setStep(Math.min(Math.max(defaultSnap, 0), snap.length - 1));
        onClose();
    }

    /** Тянуть можно? Палец — всегда, мышь и перо — только если разрешили. */
    function draggable(event: ReactPointer<HTMLElement>) {
        if (drag === false) return false;
        if (drag === true) return true;

        return event.pointerType === 'touch';
    }

    function startDrag(event: ReactPointer<HTMLElement>) {
        if (!draggable(event)) return;

        /*
         * С содержимого жест начинается только с того края, куда панель
         * уезжает: у панели снизу — когда список прокручен к началу,
         * у панели сверху — когда к концу. Иначе один и тот же жест
         * означал бы и прокрутку, и перетаскивание. С ручки — всегда.
         */
        const onHandle = event.currentTarget.classList.contains(styles.handle);

        if (!onHandle && !atEdge(bodyRef.current)) return;

        gesture.current = {from: point(event), time: event.timeStamp, distance: 0};
        dragged.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
        panelRef.current?.setAttribute('data-dragging', '');
    }

    /** Прокручено ли содержимое к тому краю, с которого начинается жест. */
    function atEdge(body: HTMLDivElement | null) {
        if (body === null) return true;

        const along = axis === 'block'
            ? {start: body.scrollTop, total: body.scrollHeight, visible: body.clientHeight}
            : {start: Math.abs(body.scrollLeft), total: body.scrollWidth, visible: body.clientWidth};

        /* Знак +1 — панель уезжает «вперёд» (вниз, вправо): жест
           начинается у начала прокрутки. Знак −1 — наоборот. */
        return sign > 0
            ? along.start <= 0
            : along.start + along.visible >= along.total - 1;
    }

    function moveDrag(event: ReactPointer<HTMLElement>) {
        const current = gesture.current;

        if (current === null) return;

        const distance = shift((point(event) - current.from) * sign, step < snap.length - 1);

        current.distance = distance;

        /* Четыре пикселя — это уже движение, а не дрожание пальца. */
        if (Math.abs(distance) > 4) dragged.current = true;
        panelRef.current?.style.setProperty('--drawer-drag', `${distance * sign}px`);
    }

    function endDrag(event: ReactPointer<HTMLElement>) {
        const current = gesture.current;

        if (current === null) return;

        gesture.current = null;
        panelRef.current?.removeAttribute('data-dragging');
        panelRef.current?.style.removeProperty('--drawer-drag');

        /*
         * Размер для решения — ВИДИМАЯ часть панели на текущей ступени,
         * а не весь её рост: порог «утянули больше трети» считается от
         * того, что человек видит. Берём пересечение с окном —
         * прямоугольник уже учитывает сдвиг покоя.
         */
        const rect = panelRef.current?.getBoundingClientRect();
        const along = rect === undefined
            ? 1
            : axis === 'block'
                ? Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
                : Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
        const elapsed = Math.max(event.timeStamp - current.time, 1);
        const decision = settle({
            distance: current.distance,
            speed: current.distance / elapsed,
            size: along,
            step,
            steps: snap.length,
        });

        if (decision.close) {
            close();

            return;
        }

        goTo(decision.index);
    }

    /* Клавиатура делает то же, что и жест: ручка — обычная кнопка. */
    function handleKeys(event: KeyboardEvent<HTMLElement>) {
        const bigger = axis === 'block' ? 'ArrowUp' : (sign > 0 ? 'ArrowLeft' : 'ArrowRight');
        const smaller = axis === 'block' ? 'ArrowDown' : (sign > 0 ? 'ArrowRight' : 'ArrowLeft');

        if (event.key !== bigger && event.key !== smaller) return;

        event.preventDefault();

        const next = event.key === bigger ? step + 1 : step - 1;

        if (next < 0) {
            close();

            return;
        }

        goTo(Math.min(next, snap.length - 1));
    }

    /*
     * Нажатие на ручку: со ступеньками — следующая по кругу, без них —
     * закрытие. Так у ручки есть смысл и без жеста, в том числе
     * для тех, кто ходит клавиатурой или переключателем.
     */
    function handleClick() {
        /* Нажатие после перетаскивания — не нажатие. */
        if (dragged.current) {
            dragged.current = false;

            return;
        }

        if (snap.length < 2) {
            close();

            return;
        }

        goTo((step + 1) % snap.length);
    }

    function goTo(next: number) {
        if (next === step) return;

        setStep(next);
        onSnapChange?.(next, snap[next]);
    }

    function point(event: ReactPointer<HTMLElement>) {
        return axis === 'block' ? event.clientY : event.clientX;
    }
}

/** «full» — это весь ход, остальное идёт в CSS как есть. */
function length(step: string) {
    return step === 'full' ? '100%' : step;
}

export {Drawer};
