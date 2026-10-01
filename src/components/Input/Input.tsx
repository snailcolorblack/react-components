// Input.tsx

/* -------------------------------------------------------------------------- */
/*  ТЕКСТОВОЕ ПОЛЕ                                                            */
/*                                                                            */
/*  Коробка, подпись и кольцо фокуса — общие с Select и Textarea, из          */
/*  ../Field. Своего здесь три вещи: маска, приписки и участие в форме        */
/*  при включённых приписках.                                                  */
/* -------------------------------------------------------------------------- */

/* --- Что делает браузер, а что мы ----------------------------------------- */
/*
 *  Браузер:
 *      сам <input> целиком — типы, клавиатура, автозаполнение, required
 *      и pattern с проверкой формы, объявление ошибки, :user-invalid
 *      для подсветки уже заполненного поля. Обёртка — <label>, поэтому
 *      клик по любому месту коробки ставит фокус в поле без обработчиков.
 *
 *  Мы:
 *      раскладка маски, фильтр символов, каретка после переписывания
 *      значения и скрытое поле для формы, когда приписки входят в значение.
 */

/* --- Маска ---------------------------------------------------------------- */
/*
 *  <Input label="Телефон" mask="+7 ### ##-##-##" format={/\d/}/>
 *
 *  Значение прогоняется через маску на каждый ввод: снять литералы →
 *  отфильтровать → надеть маску заново. Это идемпотентно, поэтому одна
 *  и та же функция приводит в порядок и набранное по символу, и вставленное
 *  из буфера, и пришедшее снаружи через value.
 *
 *  Каретка ставится руками, и без этого никак: после переписывания значения
 *  браузер сбрасывает её в конец, и править середину номера было бы нельзя.
 *  Считаем не позицию в строке, а сколько СОДЕРЖАТЕЛЬНЫХ символов стояло
 *  до каретки, — литералы между ними могут появиться и исчезнуть.
 */

/* --- Приписки ------------------------------------------------------------- */
/*
 *  Приписки лежат снаружи <input>, отдельными span. Внутрь текста их класть
 *  нельзя: тогда их можно стереть, каретка заезжала бы в них, а выделение
 *  всего поля захватывало бы лишнее.
 *
 *  Для скринридера они помечены aria-hidden и подключены через
 *  aria-describedby: имя поля остаётся подписью, а «₽» читается после него
 *  пояснением. Если бы они просто лежали внутри <label>, имя поля стало бы
 *  «Цена ₽», что неверно — это не часть названия.
 */
/* -------------------------------------------------------------------------- */

import {useId, useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent, type ReactNode} from 'react';
import {holdFocus} from '../Field/Field.focus.ts';
import {useValidity} from '../Field/Field.validity.ts';
import {capacity, display, keep, unmask} from './Input.mask.ts';
import type {InputProps} from './Input.interface.ts';
import field from '../Field/Field.module.css';
import styles from './Input.module.css';

/*
 * Приписка в значении может быть только текстом: разметку к строке
 * не приклеить. Всё остальное (иконка, span) остаётся отображением.
 */
function text(node: ReactNode) {
    return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}

/* Типы, у которых есть выделение и, значит, управляемая каретка. */
const SELECTABLE = new Set(['text', 'search', 'tel', 'url', 'password']);

function Input({
                   label,
                   name,
                   value,
                   defaultValue,
                   onChange,
                   mask,
                   format,
                   prefix,
                   suffix,
                   affixInValue = false,
                   error,
                   className = '',
                   style,
                   id,
                   onBlur,
                   onInvalid,
                   ...props
               }: InputProps) {

    const [own, setOwn] = useState(() => String(defaultValue ?? ''));
    const input = useRef<HTMLInputElement>(null);

    const auto = useId();
    const validity = useValidity(error);

    const fieldId = id ?? auto;
    const prefixId = `${fieldId}-prefix`;
    const suffixId = `${fieldId}-suffix`;
    const errorId = `${fieldId}-error`;

    /*
     * С affixInValue значение приходит обратно вместе с приписками —
     * и его надо раздеть, иначе они наслаиваются на каждый ввод: замерено,
     * после двух символов в поле стояло «https://https://example.co1m2».
     */
    const head = affixInValue ? text(prefix) : '';
    const tail = affixInValue ? text(suffix) : '';
    const source = bare(value === undefined ? own : String(value));
    const view = display(source, mask, format).view;
    const affixed = affixInValue && (prefix !== undefined || suffix !== undefined);
    /*
     * Порядок важен: сперва приписки, потом чужое пояснение, и последней
     * ошибка — её читают в конце, как итог.
     */
    const described = [
        prefix !== undefined && prefixId,
        suffix !== undefined && suffixId,
        props['aria-describedby'],
        validity.invalid && errorId,
    ].filter(Boolean).join(' ') || undefined;

    return (
        <span className={[field.group, className].filter(Boolean).join(' ')} style={style}>
            <label
                /*
                 * Приписка слева занимает то самое место, куда в пустом поле
                 * съезжает подпись, — замерено, «Сайт» ложилось прямо на
                 * «https://». Поэтому с префиксом подпись стоит наверху всегда,
                 * как будто поле уже заполнено. Суффикс не мешает: он справа.
                 */
                data-filled={view !== '' || prefix !== undefined || undefined}
                data-invalid={validity.invalid || undefined}
                className={[field.field, styles.field].join(' ')}
                onMouseDown={event => holdFocus(event, field.control)}
            >
                <span className={field.label}>{label}</span>

                <span className={field.row}>
                    {prefix !== undefined && (
                        <span id={prefixId} className={styles.affix} aria-hidden="true">{prefix}</span>
                    )}

                    <input
                        {...props}
                        ref={input}
                        id={fieldId}
                        /* При включённых приписках имя уходит скрытому полю ниже,
                           иначе значение отправилось бы дважды и без них. */
                        name={affixed ? undefined : name}
                        value={view}
                        aria-describedby={described}
                        aria-invalid={validity.invalid || undefined}
                        className={[field.control, styles.control].join(' ')}
                        onBlur={handleBlur}
                        onChange={handleChange}
                        onInvalid={handleInvalid}
                    />

                    {suffix !== undefined && (
                        <span id={suffixId} className={styles.affix} aria-hidden="true">{suffix}</span>
                    )}
                </span>

                {affixed && name !== undefined && (
                    <input type="hidden" name={name} value={full(view)}/>
                )}
            </label>

            {/*
              * Снаружи коробки, а не внутри: коробка это <label>, и её
              * содержимое целиком идёт в имя поля — замерено, именем
              * становилось «Логин Такой логин уже занят».
              *
              * Область лежит в разметке всегда: объявляется только то, что
              * появилось в уже существующей области, а не вместе с ней.
              */}
            <span id={errorId} className={field.message} aria-live="polite">{validity.message}</span>
        </span>
    );

    /* Снять приписки, если они в значении. */
    function bare(value: string) {
        let out = value;

        if (head !== '' && out.startsWith(head)) out = out.slice(head.length);
        if (tail !== '' && out.endsWith(tail)) out = out.slice(0, out.length - tail.length);

        return out;
    }

    /* Надеть приписки. Пустое поле остаётся пустым: одни приписки — не значение. */
    function full(value: string) {
        return value === '' ? '' : `${head}${value}${tail}`;
    }

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
        const element = event.currentTarget;
        const typed = element.value;
        /*
         * Сколько содержательных символов стояло до каретки. Именно они,
         * а не позиция в строке: литералы маски между ними появляются
         * и исчезают, и позиция «после третьего символа» переживёт
         * переразметку, а «шестой символ строки» — нет.
         */
        const before = keep(unmask(typed.slice(0, element.selectionStart ?? typed.length), mask, format), format).length;

        const raw = keep(unmask(typed, mask, format), format);
        const next = display(mask ? raw.slice(0, capacity(mask)) : raw, mask, format);

        if (value === undefined) setOwn(next.view);
        onChange?.(affixInValue ? full(next.view) : next.view, mask ? unmask(next.view, mask, format) : next.view);

        /*
         * Значение и каретка ставятся прямо здесь, до перерисовки: React
         * увидит в DOM то же самое, что собирается отрисовать, и трогать
         * поле не станет — а значит, не сбросит каретку в конец.
         */
        if (next.view !== typed) element.value = next.view;

        /*
         * Поправили — сообщение уходит сразу, не дожидаясь следующего blur.
         * Проверяем после маски: в поле осталось не то, что набрали.
         */
        validity.clear(element);

        /*
         * Если маска и фильтр ничего не поменяли, каретку трогать незачем:
         * обычное текстовое поле работает само, а лишняя запись выделения
         * только сбивала бы её.
         */
        if (next.view === typed) return;

        /*
         * Выделение есть не у всех типов: у email, number, date и цвета
         * setSelectionRange бросает InvalidStateError — замерено, поле
         * type="email" роняло исключение на каждое нажатие. Там каретка
         * остаётся там, куда её поставил браузер.
         */
        if (!SELECTABLE.has(element.type)) return;

        const caret = before === 0 ? 0 : (next.at[before - 1] ?? next.view.length - 1) + 1;

        element.setSelectionRange(caret, caret);
    }
}

export {Input};
