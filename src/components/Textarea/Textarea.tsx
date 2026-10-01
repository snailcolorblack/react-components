// Textarea.tsx

/* -------------------------------------------------------------------------- */
/*  МНОГОСТРОЧНОЕ ПОЛЕ                                                        */
/*                                                                            */
/*  То же поле, что у Input, без приписок и без маски: обёртка и текст.       */
/*  Коробка, подпись и кольцо фокуса — общие, из ../Field.                    */
/* -------------------------------------------------------------------------- */

/* --- Что делает браузер, а что мы ----------------------------------------- */
/*
 *  Браузер:
 *      сам <textarea> — перенос строк, прокрутка, maxLength, required,
 *      проверка формы и объявление ошибки. Авторост — тоже он:
 *      field-sizing: content пересчитывает высоту под содержимое, поэтому
 *      ни обработчика ввода, ни измерения scrollHeight здесь нет.
 *      Обёртка — <label>, так что клик по коробке ставит фокус в поле.
 *
 *  Мы:
 *      признак «поле заполнено» для плавающей подписи и значение наружу
 *      строкой, а не событием.
 */
/* -------------------------------------------------------------------------- */

import {useId, useState, type ChangeEvent, type FocusEvent, type FormEvent} from 'react';
import {holdFocus} from '../Field/Field.focus.ts';
import {useValidity} from '../Field/Field.validity.ts';
import type {TextareaProps} from './Textarea.interface.ts';
import field from '../Field/Field.module.css';
import styles from './Textarea.module.css';

function Textarea({
                      label,
                      name,
                      value,
                      defaultValue,
                      onChange,
                      autoGrow = true,
                      rows = 3,
                      error,
                      className = '',
                      id,
                      onBlur,
                      onInvalid,
                      ...props
                  }: TextareaProps) {

    const [own, setOwn] = useState(() => String(defaultValue ?? ''));

    const auto = useId();
    const validity = useValidity(error);

    const fieldId = id ?? auto;
    const errorId = `${fieldId}-error`;
    const view = value === undefined ? own : String(value);
    const described = [props['aria-describedby'], validity.invalid && errorId]
        .filter(Boolean).join(' ') || undefined;

    return (
        <span className={[field.group, className].filter(Boolean).join(' ')}>
            <label
                data-filled={view !== '' || undefined}
                data-invalid={validity.invalid || undefined}
                className={[field.field, styles.field].join(' ')}
                onMouseDown={event => holdFocus(event, field.control)}
            >
                <span className={field.label}>{label}</span>

                <span className={field.row}>
                    <textarea
                        {...props}
                        id={fieldId}
                        name={name}
                        rows={rows}
                        value={view}
                        data-grow={autoGrow || undefined}
                        aria-describedby={described}
                        aria-invalid={validity.invalid || undefined}
                        className={[field.control, styles.control].join(' ')}
                        onBlur={handleBlur}
                        onChange={handleChange}
                        onInvalid={handleInvalid}
                    />
                </span>
            </label>

            {/*
              * Снаружи коробки: коробка это <label>, и её содержимое целиком
              * идёт в имя поля. Область лежит в разметке всегда — объявляется
              * только то, что появилось в уже существующей области.
              */}
            <span id={errorId} className={field.message} aria-live="polite">{validity.message}</span>
        </span>
    );

    /* Ошибку показываем в тот же момент, что и рамку, — когда ввод закончен. */
    function handleBlur(event: FocusEvent<HTMLTextAreaElement>) {
        validity.settle(event);
        onBlur?.(event);
    }

    function handleInvalid(event: FormEvent<HTMLTextAreaElement>) {
        validity.report(event);
        onInvalid?.(event);
    }

    function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
        validity.clear(event.currentTarget);
        if (value === undefined) setOwn(event.currentTarget.value);
        onChange?.(event.currentTarget.value);
    }
}

export {Textarea};
