// Checkbox.tsx

/* -------------------------------------------------------------------------- */
/*  ФЛАЖОК                                                                    */
/*                                                                            */
/*  Настоящий <input type="checkbox"> с appearance: none. Обёртка — <label>,  */
/*  поэтому клик по подписи переключает флажок без обработчиков, а имя         */
/*  поля собирается из содержимого подписи.                                    */
/*                                                                            */
/*  Ошибка устроена так же, как у полей: текст лежит в разметке под           */
/*  флажком, а не в пузыре браузера, и связан с ним через aria-describedby.   */
/*  Лежит он СНАРУЖИ <label> — содержимое label целиком идёт в имя, и         */
/*  с текстом внутри именем флажка стало бы «Согласен Отметьте это поле».     */
/* -------------------------------------------------------------------------- */

import {useCallback, useEffect, useId, useRef, type ChangeEvent, type FocusEvent, type FormEvent} from 'react';
import {useValidity} from '../Field/Field.validity.ts';
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
                      error,
                      children,
                      className = '',
                      style,
                      ref,
                      onBlur,
                      onChange,
                      onInvalid,
                      ...props
                  }: CheckboxProps) {

    const inputRef = useRef<HTMLInputElement>(null);

    const auto = useId();
    const validity = useValidity(error);
    const setInputRef = useCallback((node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
    }, [ref]);

    /* Идентификатор нужен только сообщению: имя поле берёт из <label>,
       и своего id ему для этого не требуется. */
    const errorId = `${auto}-error`;
    const classes = [styles.control, styles.checkbox, VARIANT_CLASS[variant], className]
        .filter(Boolean)
        .join(' ');
    const described = [props['aria-describedby'], validity.invalid && errorId]
        .filter(Boolean).join(' ') || undefined;

    /*
     * Промежуточное состояние есть только в свойстве: атрибута под него
     * в разметке не существует, поэтому его ставят полю напрямую.
     */
    useEffect(() => {
        if (inputRef.current) inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
        <span className={styles.group} data-invalid={validity.invalid || undefined}>
            <label className={classes} style={style}>
                <input
                    {...props}
                    ref={setInputRef}
                    type="checkbox"
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

    /* Ошибку показываем в тот же момент, что и рамку, — когда ввод закончен. */
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

export {Checkbox};
