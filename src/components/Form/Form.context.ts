// Form.context.ts
import {createContext, use} from 'react';
import type {FormState} from './Form.interface.ts';

export const FormContext = createContext<FormState | undefined>(undefined);

/**
 * Состояние ближайшей формы: ошибки, идёт ли отправка, пробовали ли
 * отправлять.
 *
 *     const {errors, pending} = useForm();
 *
 * Нужен там, где поле лежит глубоко и передавать ошибку пропом
 * через три уровня неудобно. Рядом с полем проще взять её
 * у детей-функции: `{({errors}) => …}`.
 *
 * Вне формы бросает: молчаливое «ошибок нет» пряталось бы до первой
 * настоящей ошибки, а это худший момент, чтобы узнать о промахе.
 */
function useForm(): FormState {
    const state = use(FormContext);

    if (state === undefined) throw new Error('useForm() вызван вне <Form>');

    return state;
}

export {useForm};
