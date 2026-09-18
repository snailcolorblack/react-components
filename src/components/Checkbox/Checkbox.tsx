// Checkbox.tsx

/* -------------------------------------------------------------------------- */
/*  РАБОТА С ФЛАЖКОМ                                                          */
/*                                                                            */
/*  Обычный <input type="checkbox"> внутри <label>. Обёртка — сам label,       */
/*  поэтому id и useId не нужны: связь подписи с полем даёт вложенность,       */
/*  а кликом работает вся область.                                            */
/*                                                                            */
/*  Отсюда и единственное ограничение: внутрь нельзя класть ссылки и кнопки.   */
/*  Клик по ним достанется флажку, а вложенный интерактив внутри label         */
/*  разметку ломает.                                                          */
/* -------------------------------------------------------------------------- */

/* --- 1. Как пишется -------------------------------------------------------- */
/*
 *  <Checkbox name="terms" value="yes">Согласен с условиями</Checkbox>
 *  <Checkbox checked={on} onChange={event => setOn(event.target.checked)}>
 *      Показывать скрытые файлы
 *  </Checkbox>
 *
 *  className и style идут на обёртку — на ней оформление и переменные цвета.
 *  Всё остальное, включая ref, идёт на само поле.
 *
 *  Неотмеченный флажок в данные формы не попадает: это платформа, не мы.
 *  Нужен явный «нет» — рядом кладут скрытое поле с тем же именем.
 */

/* --- 2. Два варианта оформления ------------------------------------------- */
/*
 *  variant="DEFAULT"  — квадрат с галочкой рядом с подписью.
 *  variant="CHIP"     — квадрат скрыт, подсвечивается вся область.
 *
 *  Чип нужен там, где выбирают карточку, а не строку: плитки, теги, тарифы.
 *  Подсвечивается контейнер, поэтому внутрь можно класть что угодно —
 *  картинку, цену, две строки текста, — и ничего перекрашивать не придётся.
 *
 *  Одним цветом подписи состояние нигде не показывается. По WCAG 1.4.1 цвет
 *  не может быть единственным каналом, и в режиме высокого контраста он всё
 *  равно подменяется системой. В чипе каналов два — заливка и рамка, а в
 *  forced-colors, где не работают оба, квадрат возвращается на место.
 */

/* --- 3. Промежуточное состояние -------------------------------------------- */
/*
 *  <Checkbox indeterminate={some && !all}>Выбрать всё</Checkbox>
 *
 *  Атрибута indeterminate в HTML нет — только свойство DOM. Поэтому здесь
 *  ref и эффект, как open у Dialog: разметкой это состояние не выразить.
 *
 *  Оно чисто визуальное и в форму не уходит: в данных будет неотмеченный
 *  флажок. И оно одноразовое — клик делает флажок отмеченным, вернуть
 *  промежуточное можно только пропсом.
 */

/* --- 4. Свои цвета --------------------------------------------------------- */
/*
 *  <Checkbox style={{'--control-accent': 'var(--purple-color-200)',
 *                    '--control-accent-contrast': 'var(--contrast-color)'}}/>
 *
 *  Акцент задаётся парой: заливка и цвет галочки на ней. Порознь нельзя —
 *  галочка лежит поверх заливки и на светлом акценте пропадает.
 */

/* --- 5. Перерисовки -------------------------------------------------------- */
/*
 *  Состояния компонент не держит. Без checked он неуправляемый: значение
 *  живёт в DOM, React о переключении не знает и ничего не перерисовывает.
 *  С checked — управляемый, и перерисовка ровно одна, на изменение состояния
 *  родителя. Эффект срабатывает только при смене indeterminate.
 */
/* -------------------------------------------------------------------------- */

import {useCallback, useEffect, useRef} from 'react';
import type {ControlVariant} from '../Control/Control.interface.ts';
import type {CheckboxProps} from './Checkbox.interface.ts';
import styles from '../Control/Control.module.css';

const VARIANT_CLASS = {
    DEFAULT: '',
    CHIP: styles.chip,
} satisfies Record<ControlVariant, string>;

function Checkbox({
                      variant = 'DEFAULT',
                      indeterminate = false,
                      children,
                      className = '',
                      style,
                      ref,
                      ...props
                  }: CheckboxProps) {

    const inputRef = useRef<HTMLInputElement>(null);
    /*
     * Свой ref нужен, чтобы ставить indeterminate, но чужой при этом
     * терять нельзя — и он бывает как функцией, так и объектом.
     */
    const setInputRef = useCallback((node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
    }, [ref]);

    const classes = [styles.control, styles.checkbox, VARIANT_CLASS[variant], className]
        .filter(Boolean)
        .join(' ');

    /* Атрибута с таким именем нет — только свойство DOM. */
    useEffect(() => {
        if (inputRef.current) inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
        <label className={classes} style={style}>
            <input {...props} ref={setInputRef} type="checkbox" className={styles.input}/>
            {children !== undefined && <span className={styles.label}>{children}</span>}
        </label>
    );
}

export {Checkbox};
