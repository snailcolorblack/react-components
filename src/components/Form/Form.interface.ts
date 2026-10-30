// Form.interface.ts
import type {ComponentPropsWithRef, ReactNode} from 'react';
import type {WrapperVariant} from '../Wrapper/Wrapper.interface.ts';

/** Что лежит в поле: строка, несколько строк или файл. */
export type FormValue = string | string[] | File | File[];

/** Собранные значения формы: имя поля → значение. */
export type FormValues = Record<string, FormValue>;

/** Ошибки: имя поля → что показать. Пустая карта значит «всё в порядке». */
export type FormErrors = Record<string, ReactNode>;

/** Чем распоряжается обработчик отправки. */
export interface FormTools {
    /**
     * Показать ошибки, которых не было видно до отправки: так
     * возвращаются ответы сервера («логин занят»). Карта заменяет
     * прежнюю целиком.
     */
    setErrors: (errors: FormErrors) => void
    /** Очистить поля. */
    reset: () => void
    /** Сама форма: если понадобилось что-то, чего здесь нет. */
    form: HTMLFormElement
}

/** Что отдаётся детям-функции и хуку `useForm()`. */
export interface FormState {
    /** Ошибки по именам полей. */
    errors: FormErrors
    /** Идёт ли сейчас проверка или отправка. */
    pending: boolean
    /** Была ли хоть одна попытка отправить. */
    submitted: boolean
}

interface FormOwnProps {
    /**
     * Проверка значений. Своего формата схемы у формы нет намеренно:
     * сюда одинаково подключаются Zod, Yup, Valibot и проверка руками.
     *
     * Вернула карту ошибок — отправки не будет, ошибки встанут под
     * полями, а фокус уедет на первое негодное поле. Вернула `undefined`
     * или пустую карту — значения уходят в `onSubmit`.
     *
     * Может быть асинхронной: пока она идёт, `pending` равен `true`.
     *
     *     validate: values => {
     *         const parsed = schema.safeParse(values);
     *         if (parsed.success) return;
     *         return Object.fromEntries(parsed.error.issues
     *             .map(issue => [issue.path[0], issue.message]));
     *     }
     */
    validate?: (values: FormValues) => FormErrors | undefined | Promise<FormErrors | undefined>
    /**
     * Проверка прошла — вот значения. Может быть асинхронным: пока
     * он идёт, `pending` равен `true`, а повторные отправки гасятся.
     *
     * Бросил исключение — оно не проглатывается: ошибка уходит
     * в `onError`, а если его нет — дальше наверх.
     */
    onSubmit?: (values: FormValues, tools: FormTools) => unknown | Promise<unknown>
    /** Проверка не прошла. Вызывается после того, как ошибки показаны. */
    onInvalid?: (errors: FormErrors, values: FormValues) => void
    /** `onSubmit` бросил исключение. Без него оно уходит наверх. */
    onError?: (reason: unknown, tools: FormTools) => void
    /**
     * Ошибки снаружи: серверные, пришедшие не в ответ на эту отправку,
     * или общие для нескольких форм. Складываются с теми, что нашла
     * `validate`, и переживают перерисовку.
     */
    errors?: FormErrors
    /**
     * Уводить ли фокус на первое негодное поле. По умолчанию да:
     * иначе на длинной форме человек остаётся смотреть на кнопку,
     * а ошибка оказывается за краем экрана (WCAG 3.3.1).
     */
    focusInvalid?: boolean
    /** Очищать поля после удачной отправки. По умолчанию нет. */
    resetOnSubmit?: boolean
    /**
     * Отдать первую проверку браузеру: `required`, `type="email"`,
     * `min`, `pattern` на самих полях. По умолчанию выключено,
     * и форма идёт с `noValidate`.
     *
     * Выключено не из нелюбви к платформе, а из-за языка: текст
     * браузерной ошибки берётся из языка БРАУЗЕРА, а не страницы —
     * замерено, в Chromium с английским интерфейсом при `lang="ru"`
     * выходит «Please fill out this field.». Где это неважно,
     * включайте: проверка станет бесплатной.
     */
    native?: boolean
    /** Оформление коробки. По умолчанию `PLAIN` — форма редко карточка. */
    variant?: WrapperVariant
    children?: ReactNode | ((state: FormState) => ReactNode)
}

/**
 * Форма: сбор значений, проверка и отправка.
 *
 *     <Form validate={check} onSubmit={save}>
 *         {({errors}) => <Input label="Сумма" name="sum" error={errors.sum}/>}
 *     </Form>
 *
 * Значения не живут в состоянии React: они лежат в самих полях
 * и собираются один раз, на отправке, через `FormData`. Перерисовок
 * на нажатие клавиши нет вовсе — это главное отличие от Formik
 * и ему подобных, и ради этого форма не умеет «живых» значений.
 *
 * Проверки внутри тоже нет: есть место, куда её подключают. Любая
 * библиотека и проверка руками подходят одинаково — форме нужна
 * только карта «имя поля → ошибка».
 *
 * Что форма берёт на себя:
 *
 * * собирает значения, включая повторяющиеся имена (чекбоксы,
 *   `Select` с несколькими значениями) — они приходят массивом;
 * * держит ошибки и отдаёт их детям-функции или хуку `useForm()`;
 * * уводит фокус на первое негодное поле;
 * * гасит повторные отправки, пока идёт проверка или запрос;
 * * снимает ошибку поля, как только в него начали вводить.
 *
 * Вместе с `Flow` работает через платформу: кнопка «Дальше» живёт
 * в рамке процесса, снаружи формы, и ссылается на неё атрибутом
 * `form`. Замерено в Chromium 141 — щелчок по такой кнопке и Enter
 * в поле одинаково отправляют форму шага.
 *
 *     <Form id="flow-sum" onSubmit={(values, tools) => …}>…</Form>
 *     <Button type="submit" form="flow-sum">Дальше</Button>
 */
export type FormProps =
    Omit<ComponentPropsWithRef<'form'>, 'onSubmit' | 'onError' | 'onInvalid' | 'children'>
    & FormOwnProps;
