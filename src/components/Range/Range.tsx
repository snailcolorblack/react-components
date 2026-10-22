// Range.tsx

/* -------------------------------------------------------------------------- */
/*  ПОЛЗУНОК                                                                  */
/*                                                                            */
/*  Внутри настоящий <input type="range"> — один или два. Своего здесь        */
/*  только картинка и две вещи, которых у платформы нет: притяжка к точкам    */
/*  и разведение курсора между шариками пары.                                 */
/* -------------------------------------------------------------------------- */

/* --- Что делает браузер, а что мы ----------------------------------------- */
/*
 *  Браузер:
 *      роль slider с aria-valuemin, aria-valuemax и aria-valuenow;
 *      стрелки, Home, End, Page Up/Down; перетаскивание мышью, пальцем
 *      и пером вместе с захватом указателя; участие в форме; перевод
 *      на язык системы; упор шариков пары друг в друга.
 *
 *  Мы:
 *      дорожка, заливка, шарики и засечки; притяжка к точкам при snap;
 *      разрез, который отдаёт курсор нужному из двух полей.
 */

/* --- Почему картинка своя -------------------------------------------------- */
/*
 *  Замерено в Chromium 141: appearance: base у поля ещё нет, ::slider-thumb
 *  тоже (CSS.supports обоих — false). Значит, выбор был между вендорными
 *  псевдоэлементами у каждого движка своими и собственной отрисовкой.
 *
 *  Решило дело другое: у пары поля лежат друг на друге, и курсор достаётся
 *  верхнему. Замерено — без разделения перетаскивание левого шарика двигало
 *  правый. Разводит их clip-path по середине между значениями (он влияет
 *  на попадание курсора), но резать поле вместе с его же родным шариком
 *  нельзя — шарик срезало бы пополам. Поэтому шарики рисует обёртка,
 *  а поля лежат поверх прозрачным слоем ввода. Одиночный ползунок устроен
 *  так же, чтобы вид и код были одни на оба варианта.
 *
 *  Начатое перетаскивание разрез не ломает: замерено, шарик, схваченный
 *  на 20% шкалы, доезжает до упора на 90%, хотя разрез давно позади —
 *  браузер на время перетаскивания захватывает указатель.
 */

/* --- Упор шариков ---------------------------------------------------------- */
/*
 *  Упор держим мы, хотя у платформы есть способ изящнее: сузить min и max
 *  самих полей до значения соседа, как советует APG. Замерено, почему он
 *  не подошёл: браузер растягивает ВСЮ ширину поля на его диапазон,
 *  поэтому у старшего поля с min = 20 курсор посередине дорожки означал
 *  значение 60, а не 50, и схваченный шарик уезжал от курсора — 17px
 *  у левого края при ширине 121px. Человек тащит шарик, а шарик едет
 *  быстрее руки.
 *
 *  Поэтому границы полей остаются полными — пересчёт нажатия у обоих
 *  одинаковый, шарик держится за курсор, — а предел проверяется в commit.
 *  Браузер при этом продолжает тащить свой невидимый шарик дальше упора;
 *  значение поля задано React и возвращается на место каждым событием,
 *  так что видимый шарик стоит на упоре.
 *
 *  Объявленные границы при этом остаются APG-шными: aria-valuemin
 *  и aria-valuemax отдают предел соседа, и скринридер читает именно его
 *  (замерено — ARIA перебивает min и max разметки).
 */

/* --- Притяжка к точкам ----------------------------------------------------- */
/*
 *  Нативного способа нет. <datalist> рисует засечки, но значение к ним
 *  не притягивает — замерено: на шкале 0–10 с точками 2, 4 и 8
 *  перетаскивание на 33% давало 3, на 55% — 6.
 *
 *  Поэтому при snap шаг отдаётся браузеру как «любой», а значение
 *  притягивается к ближайшей точке на каждое событие input. Клавиатура
 *  при этом перехватывается: стрелка должна шагать к СОСЕДНЕЙ точке,
 *  а не на step. Иначе на шкале 0–10 с точками 2, 4, 8 стрелка сдвигала бы
 *  значение на единицу, притяжка возвращала бы его в ту же точку,
 *  и ползунок стоял бы на месте.
 */
/* -------------------------------------------------------------------------- */

import {
    useId,
    useRef,
    useState,
    type ChangeEvent,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import type {RangeMark, RangePairProps, RangeProps, RangeSingleProps} from './Range.interface.ts';
import field from '../Field/Field.module.css';
import styles from './Range.module.css';

const THUMBS = ['от', 'до'] as const;
/* Клавиши, которые при snap ведут не на шаг, а к соседней точке. */
const STEP_KEYS: Record<string, number> = {
    ArrowRight: 1, ArrowUp: 1, PageUp: 1,
    ArrowLeft: -1, ArrowDown: -1, PageDown: -1,
};

function Range({
                   label,
                   min = 0,
                   max = 100,
                   step = 1,
                   marks,
                   snap = false,
                   name,
                   disabled = false,
                   error,
                   format,
                   thumbs = THUMBS,
                   minDifference = 0,
                   value,
                   defaultValue,
                   onChange,
                   className = '',
                   style,
                   ...props
               }: RangeProps) {

    const [own, setOwn] = useState<number[]>(() => toList(defaultValue ?? (Array.isArray(value ?? defaultValue) ? [min, max] : min)),);
    const rootRef = useRef<HTMLDivElement>(null);

    const id = useId();

    const labelId = `${id}-label`;
    const errorId = `${id}-error`;

    const current = value === undefined ? own : toList(value);
    /*
     * Пара или одиночный — решает само значение, отдельного пропа нет.
     * Считается по тому, что сейчас рисуется, а не по пропу: defaultValue
     * читается один раз при создании, и если смотреть на него, после
     * смены пропа число шариков разошлось бы с числом значений
     * (поймано тестом). Переключить вид после создания можно через key —
     * это обычное правило React для неуправляемых полей.
     */
    const pair = current.length === 2;
    const stops = snap ? allowed(min, max, marks) : undefined;
    const ticks = points(marks, min, max);
    /* Под шкалой подписаны и края: человеку нужно видеть, где она
       начинается и кончается, а не только промежуточные точки. */
    const scale = ticks.length === 0 ? [] : edges(ticks, min, max);

    return (
        <div className={[field.group, className].filter(Boolean).join(' ')} style={style}>
            <span id={labelId} className={styles.label}>{label}</span>

            <div
                {...props}
                ref={rootRef}
                data-pair={pair || undefined}
                data-disabled={disabled || undefined}
                className={styles.range}
                style={vars(current, pair, min, max)}
            >
                <span className={styles.track} aria-hidden="true"/>
                <span className={styles.fill} aria-hidden="true"/>

                {ticks.map(tick => (
                    <span
                        key={tick.value}
                        aria-hidden="true"
                        className={styles.tick}
                        style={{'--range-at': share(tick.value, min, max)} as CSSProperties}
                    />
                ))}

                {current.map((one, index) => (
                    <span
                        key={index}
                        aria-hidden="true"
                        data-thumb={index}
                        className={styles.thumb}
                        style={{'--range-at': share(one, min, max)} as CSSProperties}
                    />
                ))}

                {/* Имена шариков. Имя каждого поля собирается из подписи
                    и этого слова сразу — aria-labelledby принимает список. */}
                {pair && thumbs.map((thumb, index) => (
                    <span key={index} id={`${id}-thumb-${index}`} className={field.srOnly}>{thumb}</span>
                ))}

                {current.map((one, index) => (
                    <input
                        key={index}
                        type="range"
                        data-input={index}
                        className={styles.input}
                        /*
                         * Границы поля всегда полные: от них зависит,
                         * как браузер переводит точку нажатия в значение,
                         * и сужать их — значит растягивать ту же ширину
                         * на меньший диапазон. Предел соседа держит
                         * commit, а объявляет aria-valuemin/aria-valuemax.
                         */
                        min={min}
                        max={max}
                        aria-valuemin={pair ? bounds(index).low : undefined}
                        aria-valuemax={pair ? bounds(index).high : undefined}
                        /*
                         * При притяжке шаг отдаётся как «любой»: иначе
                         * браузер сперва округлил бы значение к сетке шага,
                         * а мы следом — к точке, и на шкале с неровными
                         * точками два округления подряд промахивались бы.
                         */
                        step={snap ? 'any' : step}
                        value={one}
                        name={name}
                        disabled={disabled}
                        aria-labelledby={pair ? `${labelId} ${id}-thumb-${index}` : labelId}
                        aria-valuetext={speak(one, ticks, format)}
                        aria-describedby={error ? errorId : undefined}
                        onChange={event => handleChange(index, event)}
                        onKeyDown={event => handleKeyDown(index, event)}
                    />
                ))}
            </div>

            {scale.length > 0 && (
                /* Подписи шкалы. Для скринридера они шум: те же числа он
                   уже получает в aria-valuemin, aria-valuemax и valuetext. */
                <div className={styles.marks} aria-hidden="true">
                    {scale.map(tick => (
                        <span
                            key={tick.value}
                            className={styles.mark}
                            /* Крайние подписи равняются по краю дорожки,
                               а не по центру точки: иначе половина слова
                               вылезает за пределы ползунка. */
                            data-edge={tick.value === min ? 'start' : tick.value === max ? 'end' : undefined}
                            style={{'--range-at': share(tick.value, min, max)} as CSSProperties}
                        >
                            {tick.label ?? format?.(tick.value) ?? tick.value}
                        </span>
                    ))}
                </div>
            )}

            <span id={errorId} className={field.message} aria-live="polite">{error}</span>
        </div>
    );

    function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
        const raw = Number(event.currentTarget.value);

        commit(index, stops === undefined ? raw : nearest(stops, raw));
    }

    /*
     * Клавиатура своя только при притяжке — и только на тех клавишах,
     * которые двигают значение. Всё остальное, включая Tab, остаётся
     * браузеру.
     */
    function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
        if (stops === undefined || event.altKey || event.ctrlKey || event.metaKey) return;

        const shift = STEP_KEYS[event.key];
        const edge = event.key === 'Home' ? 0 : event.key === 'End' ? stops.length - 1 : undefined;

        if (shift === undefined && edge === undefined) return;

        event.preventDefault();

        const here = stops.indexOf(nearest(stops, current[index]));
        const next = edge ?? Math.min(Math.max(here + shift, 0), stops.length - 1);

        commit(index, stops[next]);
    }

    /*
     * У пары предел — значение соседа, отодвинутое.
     * на minDifference; у одиночного это просто края шкалы.
     */
    function bounds(index: number) {
        if (!pair) return {low: min, high: max};

        return index === 0
            ? {low: min, high: current[1] - minDifference}
            : {low: current[0] + minDifference, high: max};
    }

    function commit(index: number, raw: number) {
        /*
         * Предел проверяем здесь, а не атрибутами поля: сузить min и max
         * нельзя (тогда браузер растягивает всю ширину на укороченный
         * диапазон, и шарик уезжает от курсора), а клавиатуру при притяжке
         * ведём мы сами.
         */
        const {low, high} = bounds(index);
        const next = [...current];

        /* Промежуток шире оставшегося места — двигаться некуда. */
        if (low > high) return;

        next[index] = Math.min(Math.max(raw, low), high);

        /*
         * При притяжке возвращаем шарик на точку: обрезка предыдущей
         * строкой могла поставить его между точками, и без этого
         * minDifference ломал бы саму притяжку.
         */
        if (stops !== undefined) {
            const inside = stops.filter(stop => stop >= low && stop <= high);

            if (inside.length === 0) return;

            next[index] = nearest(inside, next[index]);
        }

        if (next[index] === current[index]) return;

        /*
         * Картинку двигаем сразу, не дожидаясь перерисовки: за одно
         * перетаскивание событий немного (замерено, 7 на 25 шагов мыши),
         * но между событием и кадром не должно быть ничего лишнего.
         * Для React это та же запись, что он сделал бы сам, — ниже она
         * повторится в style и значения сойдутся.
         */
        paint(rootRef.current, next, pair, min, max);

        if (value === undefined) setOwn(next);

        if (pair) (onChange as RangePairProps['onChange'])?.([next[0], next[1]]);
        else (onChange as RangeSingleProps['onChange'])?.(next[0]);
    }
}

/* -------------------------------------------------------------------------- */
/*  Числа и точки                                                             */

/* -------------------------------------------------------------------------- */

function toList(value: number | readonly number[]): number[] {
    return Array.isArray(value) ? [...value] : [value as number];
}

/** Доля значения на шкале: из неё CSS считает место шарика и засечки. */
function share(value: number, min: number, max: number) {
    if (max === min) return 0;

    return Math.min(Math.max((value - min) / (max - min), 0), 1);
}

/** Точки для отрисовки: числа и объекты приводятся к одному виду. */
function points(marks: readonly RangeMark[] | undefined, min: number, max: number) {
    if (marks === undefined) return [];

    const seen = new Set<number>();
    const list: { value: number, label?: ReactNode }[] = [];

    for (const mark of marks) {
        const one = typeof mark === 'number' ? {value: mark} : mark;

        if (one.value < min || one.value > max || seen.has(one.value)) continue;

        seen.add(one.value);
        list.push(one);
    }

    return list.sort((a, b) => a.value - b.value);
}

/**
 * Точки вместе с краями шкалы — то, что подписывается под дорожкой.
 * Края добавляются всегда: без них не видно, от чего и до чего шкала.
 * Своя подпись края, если её задали точкой, остаётся.
 */
function edges(ticks: { value: number, label?: ReactNode }[], min: number, max: number) {
    const has = (value: number) => ticks.some(tick => tick.value === value);
    const list = [...ticks];

    if (!has(min)) list.unshift({value: min});
    if (!has(max)) list.push({value: max});

    return list;
}

/**
 * Значения, на которых ползунок может стоять при притяжке: края шкалы
 * и точки. Края добавляются всегда — иначе до min и max нельзя было бы
 * добраться вовсе, а это границы, объявленные в aria-valuemin и aria-valuemax.
 */
function allowed(min: number, max: number, marks: readonly RangeMark[] | undefined) {
    const list = points(marks, min, max).map(mark => mark.value);

    return [...new Set([min, ...list, max])].sort((a, b) => a - b);
}

function nearest(stops: readonly number[], value: number) {
    let best = stops[0];

    for (const stop of stops) {
        if (Math.abs(stop - value) < Math.abs(best - value)) best = stop;
    }

    return best;
}

/**
 * Что скринридер скажет вместо числа. Своя подпись точки важнее формата:
 * «много» понятнее, чем «8». Без того и другого atribut не ставится вовсе —
 * браузер сам прочитает число, и прочитает на языке системы.
 */
function speak(value: number, ticks: { value: number, label?: ReactNode }[], format?: (value: number) => string) {
    const here = ticks.find(tick => tick.value === value);

    if (typeof here?.label === 'string') return here.label;

    return format?.(value);
}

/* -------------------------------------------------------------------------- */
/*  Переменные раскладки                                                      */
/*                                                                            */
/*  Места шариков и заливки живут в CSS, а не в пикселях: доля от 0 до 1,     */
/*  из которой CSS считает положение с поправкой на диаметр шарика.           */
/*  При изменении ширины ничего пересчитывать не нужно — ни обработчика       */
/*  resize, ни наблюдателя.                                                   */

/* -------------------------------------------------------------------------- */

function vars(current: number[], pair: boolean, min: number, max: number) {
    return {
        '--range-from': pair ? share(current[0], min, max) : 0,
        '--range-to': share(current[pair ? 1 : 0], min, max),
    } as CSSProperties;
}

function paint(node: HTMLElement | null, current: number[], pair: boolean, min: number, max: number) {
    if (node === null) return;

    node.style.setProperty('--range-from', String(pair ? share(current[0], min, max) : 0));
    node.style.setProperty('--range-to', String(share(current[pair ? 1 : 0], min, max)));
}

export {Range};
