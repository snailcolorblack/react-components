// Toast.tsx

/* -------------------------------------------------------------------------- */
/*  ВСПЛЫВАЮЩИЕ СООБЩЕНИЯ                                                     */
/*                                                                            */
/*  Toast — это ОБЛАСТЬ, а не одна плашка. Компонент монтируется один раз,    */
/*  ничего не рисует на месте и держит очередь сам: сколько раз позвали       */
/*  show, столько плашек и стоит в углу. Четыре ошибки — четыре сообщения.    */
/*                                                                            */
/*  Область — ориентир (role="region") со своим именем. Имён на странице     */
/*  не должно быть двух одинаковых: axe даёт landmark-unique, и это           */
/*  замерено на демо-странице с двумя областями. Отсюда проп label.           */
/*                                                                            */
/*  Движение одностороннее: снаружи сообщение показывают (ref.show), а        */
/*  закрывает его сама плашка — крестиком или таймером. Поэтому у ручки       */
/*  нет ни hide, ни clear: код, который показал сообщение, давно отработал    */
/*  и знать, когда его пора убирать, не может.                                */
/* -------------------------------------------------------------------------- */

/* --- Что делает браузер, а что мы ----------------------------------------- */
/*
 *  Браузер (popover="manual" на области):
 *      верхний слой — сообщения не режутся overflow: hidden, не спорят
 *      с z-index и не требуют ни portal-контейнера в разметке, ни
 *      выдуманного z-index: 9999. manual, а не auto: auto закрывается
 *      по Esc и по клику мимо и вытесняет другие auto-поповеры — тост
 *      не должен ни исчезать от случайного клика, ни закрывать чужое меню.
 *
 *  CSS (@starting-style + display allow-discrete):
 *      сами переходы появления и ухода. Классов «entering» нет, но тайминг
 *      ухода знает и JS: метку closing ставит состояние, а узел снимается
 *      таймером EXIT_MS, который вручную держат равным --toast-duration.
 *
 *  Мы:
 *      очередь, таймеры с паузой, крестик, выбор угла.
 */

/* --- Почему плашка не поповер сама по себе -------------------------------- */
/*
 *  Соблазн есть: тогда у каждой были бы родные showPopover/hidePopover
 *  и commandfor. Но поповер попадает в верхний слой и выпадает из
 *  раскладки — замерено в Chromium 141: две плашки с popover внутри
 *  одной сетки обе встали в 0,0 и легли друг на друга, а обычный сосед
 *  рядом встал в свой угол. Стек из четырёх сообщений и popover
 *  на каждой плашке — вещи взаимоисключающие, поэтому поповер один,
 *  на всю область, а плашки внутри — обычные дети сетки.
 */

/* --- Живой регион --------------------------------------------------------- */
/*
 *  Объявляет сообщение не плашка, а область: живой регион должен
 *  существовать в DOM ДО того, как в нём появится текст, иначе он часто
 *  молчит. Область создаётся один раз на угол и остаётся, а плашка
 *  вставляется в неё уже потом — это и есть событие для скринридера.
 *
 *  Поэтому плашка внутри — обычный Alert без live: вложенный живой регион
 *  внутри живого региона приводил бы к двойному объявлению.
 */
/* -------------------------------------------------------------------------- */

import {useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Alert} from '../Alert/Alert.tsx';
import type {Item, PlateProps, ToastHandle, ToastPosition, ToastProps} from './Toast.interface.ts';
import styles from './Toast.module.css';

/*
 * Сколько плашка ещё живёт после закрытия. Совпадает с --toast-duration
 * в стилях: пока идёт переход, элемент на месте, иначе уходить было бы
 * нечему.
 */
const EXIT_MS = 160;

const REGIONS = new Map<ToastPosition, HTMLElement>();

function Toast({
                   position = 'BOTTOM_END',
                   duration = 3000,
                   label = 'Уведомления',
                   closeLabel = 'Закрыть',
                   className = '',
                   ref,
               }: ToastProps) {

    const [items, setItems] = useState<Item[]>([]);
    const nextId = useRef(0);
    const exits = useRef(new Set<ReturnType<typeof setTimeout>>());

    /* Дождаться конца перехода и только потом убрать плашку из очереди. */
    const wait = useCallback((done: () => void) => {
        const timer = setTimeout(() => {
            exits.current.delete(timer);
            done();
        }, EXIT_MS);

        exits.current.add(timer);
    }, []);

    /*
     * Закрытие в два шага: сперва метка closing — плашка отыгрывает
     * переход, — и только потом элемент уходит из очереди. Снять его
     * сразу нельзя: React уберёт узел в том же кадре, и анимировать
     * будет нечего.
     */
    const dismiss = useCallback((id: number) => {
        setItems(list => list.map(item => item.id === id ? {...item, closing: true} : item));
        wait(() => setItems(list => list.filter(item => item.id !== id)));
    }, [wait]);

    useImperativeHandle(ref, (): ToastHandle => ({
        show(content, options = {}) {
            setItems(list => [...list, {...options, id: nextId.current++, content}]);
            /*
             * Подняться в верхнем слое заново: порядок там — порядок
             * показа, поэтому область, показанная при первом сообщении,
             * оказалась бы ПОД диалогом, открытым позже. Скрыть и
             * показать в одной задаче браузер отрисует один раз.
             */
            raise(REGIONS.get(position));
        },
    }), [position]);

    useEffect(() => {
        const timers = exits.current;

        return () => timers.forEach(clearTimeout);
    }, []);


    return createPortal(
        items.map(item => (
            <Plate
                key={item.id}
                item={item}
                duration={item.duration ?? duration}
                closeLabel={closeLabel}
                className={className}
                onDismiss={() => dismiss(item.id)}
            />
        )),
        region(position, label),
    );

}

/* -------------------------------------------------------------------------- */
/*  Одна плашка: свой таймер и своя пауза                                     */
/* -------------------------------------------------------------------------- */

function Plate({item, duration, closeLabel, className, onDismiss}: PlateProps) {
    const [paused, setPaused] = useState(false);
    const rest = useRef(duration);
    const since = useRef(0);
    const dismiss = useRef(onDismiss);

    useEffect(() => {
        dismiss.current = onDismiss;
    });

    useEffect(() => {
        if (item.closing || duration <= 0 || paused) return;

        since.current = Date.now();
        const timer = setTimeout(() => dismiss.current(), rest.current);

        /*
         * Пауза — это снятый таймер плюс запомненный остаток, а не
         * перезапуск с нуля: иначе достаточно было бы водить курсором,
         * чтобы сообщение висело вечно.
         */
        return () => {
            clearTimeout(timer);
            rest.current -= Date.now() - since.current;
        };
    }, [item.closing, paused, duration]);

    return (
        <Alert
            variant={item.variant}
            /* Значок отдаём Alert, а не рисуем сами: иначе рядом со своим
               встал бы ещё и значок варианта — два подряд об одном и том же. */
            icon={item.icon}
            data-state={item.closing ? 'closed' : 'open'}
            className={`${styles.toast} ${className}`.trim()}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <span className={styles.text}>{item.content}</span>
            <button
                type="button"
                className={styles.close}
                aria-label={closeLabel}
                onClick={() => dismiss.current()}
            >
                <span aria-hidden="true">×</span>
            </button>
        </Alert>
    );
}

/* -------------------------------------------------------------------------- */
/*  Область: одна на угол                                                     */
/* -------------------------------------------------------------------------- */

function region(position: ToastPosition, label: string) {
    const known = REGIONS.get(position);

    if (known?.isConnected) {
        known.setAttribute('aria-label', label);

        return known;
    }

    const element = document.createElement('div');

    element.className = styles.region;
    element.dataset.position = position;
    element.setAttribute('popover', 'manual');
    element.setAttribute('role', 'region');
    element.setAttribute('aria-label', label);
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-atomic', 'false');

    document.body.append(element);
    REGIONS.set(position, element);
    raise(element);

    return element;
}

/*
 * showPopover и hidePopover бросают InvalidStateError, если поповер уже
 * в нужном состоянии, а в движке без Popover API их нет вовсе. Сообщение
 * при этом останется на месте — просто в обычном потоке, а не в верхнем
 * слое.
 */
function raise(element: HTMLElement | undefined) {
    if (!element?.isConnected) return;

    try {
        element.hidePopover();
    } catch {
        /* уже скрыт */
    }

    try {
        element.showPopover();
    } catch {
        /* движок без Popover API */
    }
}

export {Toast};