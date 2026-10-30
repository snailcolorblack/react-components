// Form.tsx

/* -------------------------------------------------------------------------- */
/*  ФОРМА                                                                     */
/*                                                                            */
/*  Сбор значений, проверка, отправка. Своего состояния на поле нет           */
/*  вовсе: значения лежат в самих полях и собираются один раз, на             */
/*  отправке, через FormData. Перерисовок на нажатие клавиши не бывает.       */
/*                                                                            */
/*  Это главное отличие от Formik и ему подобных и главная причина,           */
/*  по которой форма такая маленькая. Цена честная: «живых» значений          */
/*  она не даёт — поле, которое показывается в зависимости от другого         */
/*  поля, по-прежнему пишется руками.                                         */
/* -------------------------------------------------------------------------- */

/* --- Почему проверки внутри нет ------------------------------------------- */
/*
 *  Форме нужна карта «имя поля → ошибка», и откуда она взялась — её
 *  не касается. Zod, Yup, Valibot, проверка руками и ответ сервера
 *  подключаются одинаково. Свой формат схемы означал бы третью
 *  схему в проекте рядом с той, что уже есть на сервере.
 */

/* --- Почему noValidate по умолчанию --------------------------------------- */
/*
 *  Браузер умеет проверять сам (required, type="email", min, pattern),
 *  и это бесплатно. Но текст ошибки он берёт из языка СВОЕГО интерфейса,
 *  а не страницы: замерено, в Chromium с английским интерфейсом при
 *  lang="ru" выходит «Please fill out this field.». Для банковской
 *  формы это не годится, поэтому по умолчанию проверку берём на себя,
 *  а проп native возвращает её платформе.
 */

/* --- Фокус на первое негодное поле ---------------------------------------- */
/*
 *  Без этого на длинной форме человек остаётся смотреть на кнопку,
 *  а ошибка оказывается за краем экрана. Ведём фокус к самому полю,
 *  а не к сообщению: сообщение связано с полем через aria-describedby
 *  и будет прочитано вместе с ним.
 *
 *  У Select значение несут скрытые input — они не фокусируются
 *  (замерено: offsetParent равен null). Поэтому фокус ищется рядом:
 *  см. reach() в Form.values.ts.
 */
/* -------------------------------------------------------------------------- */

import {useEffect, useRef, useState, type FormEvent, type InputEvent, type ReactNode} from 'react';
import {Wrapper} from '../Wrapper/Wrapper.tsx';
import {FormContext} from './Form.context.ts';
import {collect, reach} from './Form.values.ts';
import type {FormErrors, FormProps, FormState, FormTools} from './Form.interface.ts';

function Form({
                  validate,
                  onSubmit,
                  onInvalid,
                  onError,
                  errors: outer,
                  focusInvalid = true,
                  resetOnSubmit = false,
                  native = false,
                  variant = 'PLAIN',
                  children,
                  noValidate,
                  onInput,
                  ...props
              }: FormProps) {

    const [found, setFound] = useState<FormErrors>({});
    const [pending, setPending] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    /* Повторная отправка гасится здесь, а не состоянием: состояние
       доедет только к следующей отрисовке, а второй щелчок приходит
       раньше. */
    const busy = useRef(false);
    /* Сама форма и поле, которое ждёт фокуса. Оба нужны уже после
       отрисовки ошибок — см. эффект ниже. */
    const box = useRef<HTMLFormElement | undefined>(undefined);
    const want = useRef<string | undefined>(undefined);

    const errors = {...found, ...outer};
    const state: FormState = {errors, pending, submitted};

    /*
     * Фокус уводится эффектом, а не сразу после проверки. Замерено:
     * из requestAnimationFrame он не попадал в Select — кадр успевал
     * раньше, чем React дорисовывал ошибку, поля ещё не были помечены
     * aria-invalid, и фокус оставался на body, то есть в начале
     * страницы. Эффект идёт после отрисовки, и искать уже есть что.
     */
    useEffect(() => {
        const name = want.current;

        want.current = undefined;

        if (name === undefined || box.current === undefined) return;

        reach(box.current, name)?.focus();
    }, [found]);

    return (
        <FormContext.Provider value={state}>
            <Wrapper
                {...props}
                as="form"
                variant={variant}
                /* Проверку ведём сами — см. шапку про язык сообщений. */
                noValidate={noValidate ?? !native}
                onSubmit={submit}
                onInput={input}
            >
                {typeof children === 'function' ? children(state) : (children as ReactNode)}
            </Wrapper>
        </FormContext.Provider>
    );

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (busy.current) return;

        const form = event.currentTarget;
        const tools: FormTools = {setErrors: setFound, reset: () => form.reset(), form};

        box.current = form;

        setSubmitted(true);

        /*
         * Браузерная проверка, если её попросили. Сообщения показывают
         * сами поля: событие invalid они уже слушают (Field.validity.ts),
         * и пузырь браузера там погашен.
         */
        if (native && !form.checkValidity()) {
            if (focusInvalid) form.querySelector<HTMLElement>(':invalid')?.focus();

            return;
        }

        const values = collect(form);

        busy.current = true;
        setPending(true);

        try {
            const bad = await validate?.(values);

            if (bad !== undefined && Object.keys(bad).length > 0) {
                setFound(bad);
                /* Фокус — после отрисовки ошибок, см. эффект выше. */
                if (focusInvalid) want.current = Object.keys(bad)[0];
                onInvalid?.(bad, values);

                return;
            }

            setFound({});

            await onSubmit?.(values, tools);

            if (resetOnSubmit) form.reset();
        } catch (reason) {
            /* Без обработчика исключение уходит наверх: проглотить его
               здесь значило бы показать человеку форму, которая молча
               ничего не сделала. */
            if (onError === undefined) throw reason;

            onError(reason, tools);
        } finally {
            busy.current = false;
            setPending(false);
        }
    }

    /*
     * Ввод снимает ошибку этого поля, а не всей формы: соседние ошибки
     * никуда не делись, и прятать их — врать. Момент тот же, что у полей:
     * они снимают своё сообщение на input.
     */
    function input(event: InputEvent<HTMLFormElement>) {
        const target = event.target as HTMLElement & {name?: string};
        const name = target.name;

        if (name !== undefined && name !== '' && found[name] !== undefined) {
            setFound(was => {
                const rest = {...was};
                delete rest[name];

                return rest;
            });
        }

        onInput?.(event);
    }
}

export {Form};
