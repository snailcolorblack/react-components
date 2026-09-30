// Switch.tsx

/* -------------------------------------------------------------------------- */
/*  ПЕРЕКЛЮЧАТЕЛЬ «ВКЛ/ВЫКЛ»                                                  */
/*                                                                            */
/*  Настоящий <input type="checkbox"> с role="switch": состояние читается     */
/*  как «включено/выключено», а не «отмечено», но клавиатура, форма и фокус   */
/*  остаются платформенными. Обёртка — <label>, клик по подписи переключает.  */
/*                                                                            */
/*  Ошибка устроена как у флажка: текст под переключателем, снаружи <label>,  */
/*  чтобы не попасть в имя.                                                   */
/* -------------------------------------------------------------------------- */

import {useId, type ChangeEvent, type FocusEvent, type FormEvent} from 'react';
import {useValidity} from '../Field/Field.validity.ts';
import type {SwitchProps} from './Switch.interface.ts';
import control from '../Control/Control.module.css';
import styles from './Switch.module.css';

function Switch({
                    error,
                    children,
                    className = '',
                    style,
                    onBlur,
                    onChange,
                    onInvalid,
                    ...props
                }: SwitchProps) {

    const auto = useId();
    const validity = useValidity(error);

    /* Идентификатор нужен только сообщению: имя поле берёт из <label>,
       и своего id ему для этого не требуется. */
    const errorId = `${auto}-error`;
    const classes = [styles.switch, className].filter(Boolean).join(' ');
    const described = [props['aria-describedby'], validity.invalid && errorId]
        .filter(Boolean).join(' ') || undefined;

    return (
        <span className={control.group} data-invalid={validity.invalid || undefined}>
            <label className={classes} style={style}>
                <input
                    {...props}
                    type="checkbox"
                    role="switch"
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
            <span id={errorId} className={control.message} aria-live="polite">{validity.message}</span>
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

export {Switch};
