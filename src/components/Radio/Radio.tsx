// Radio.tsx

/* -------------------------------------------------------------------------- */
/*  ПЕРЕКЛЮЧАТЕЛЬ                                                             */
/*                                                                            */
/*  Настоящий <input type="radio">: группу, стрелки и выбор одного из многих  */
/*  делает браузер по общему атрибуту name. Обёртка — <label>, поэтому клик   */
/*  по подписи выбирает вариант без обработчиков.                            */
/*                                                                            */
/*  Ошибка — как у полей: текст в разметке под переключателем, связан через   */
/*  aria-describedby. Лежит снаружи <label>, иначе ушёл бы в имя варианта.    */
/*  Обязательной делают всю группу: required хватает поставить одному         */
/*  из вариантов, браузер проверит группу целиком.                            */
/* -------------------------------------------------------------------------- */

import {useId, type ChangeEvent, type FocusEvent, type FormEvent} from 'react';
import {useValidity} from '../Field/Field.validity.ts';
import type {ControlVariant} from '../Control/Control.interface.ts';
import type {RadioProps} from './Radio.interface.ts';
import styles from '../Control/Control.module.css';

const VARIANT_CLASS = {
    DEFAULT: '',
    CHIP: styles.chip,
} satisfies Record<ControlVariant, string>;

function Radio({
                   variant = 'DEFAULT',
                   error,
                   children,
                   className = '',
                   style,
                   onBlur,
                   onChange,
                   onInvalid,
                   ...props
               }: RadioProps) {

    const auto = useId();
    const validity = useValidity(error);

    /* Идентификатор нужен только сообщению: имя поле берёт из <label>,
       и своего id ему для этого не требуется. */
    const errorId = `${auto}-error`;
    const classes = [styles.control, styles.radio, VARIANT_CLASS[variant], className]
        .filter(Boolean)
        .join(' ');
    const described = [props['aria-describedby'], validity.invalid && errorId]
        .filter(Boolean).join(' ') || undefined;

    return (
        <span className={styles.group} data-invalid={validity.invalid || undefined}>
            <label className={classes} style={style}>
                <input
                    {...props}
                    type="radio"
                    aria-describedby={described}
                    aria-invalid={validity.invalid || undefined}
                    className={styles.input}
                    onBlur={handleBlur}
                    onChange={handleChange}
                    onInvalid={handleInvalid}
                />
                <span className={styles.label}>{children}</span>
            </label>

            {/* Область лежит в разметке всегда: объявляется только то, что
                появилось в уже существующей области, а не вместе с ней. */}
            <span id={errorId} className={styles.message} aria-live="polite">{validity.message}</span>
        </span>
    );

    function handleBlur(event: FocusEvent<HTMLInputElement>) {
        validity.settle(event);
        onBlur?.(event);
    }

    function handleInvalid(event: FormEvent<HTMLInputElement>) {
        validity.report(event);
        onInvalid?.(event);
    }

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        validity.clear(event.currentTarget);
        onChange?.(event);
    }
}

export {Radio};
