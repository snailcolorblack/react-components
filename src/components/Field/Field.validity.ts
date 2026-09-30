// Field.validity.ts

/* -------------------------------------------------------------------------- */
/*  ОШИБКА ПОЛЯ                                                               */
/*                                                                            */
/*  Одна механика на Select, Input и Textarea: текст ошибки лежит в разметке  */
/*  под полем, а не в пузыре браузера.                                        */
/*                                                                            */
/*  Пузырь исчезает по таймеру, не остаётся в дереве доступности и не имеет   */
/*  адреса, на который можно сослаться из aria-describedby. Поэтому событие   */
/*  invalid мы гасим (preventDefault) и показываем тот же самый текст сами,   */
/*  из validationMessage.                                                     */
/*                                                                            */
/*  Язык этого текста — язык БРАУЗЕРА, а не страницы: замерено, в Chromium     */
/*  с английским интерфейсом при lang="ru" выходит «Please fill out this      */
/*  field.». Где формулировка важна, её задают пропом error.                  */
/*                                                                            */
/*  Момент появления совпадает с рамкой: и то, и другое привязано к           */
/*  :user-invalid, то есть к «человек закончил ввод», а не к «форма           */
/*  открылась». Сообщение снаружи (error) сильнее: его ставит сервер, и       */
/*  браузер о нём не знает.                                                   */
/* -------------------------------------------------------------------------- */

import {useState, type ReactNode, type SyntheticEvent} from 'react';

/** Поле, у которого есть проверка: и <input>, и <textarea>. */
type Control = HTMLInputElement | HTMLTextAreaElement;

/*
 * :user-invalid поддержан не везде (в jsdom его нет вовсе, и matches там
 * бросает исключение). Где нет — показываем по итогу обычной проверки:
 * момент будет чуть ранний, но текст тот же.
 */
const USER_INVALID = supports(':user-invalid');

function supports(selector: string) {
    try {
        document.createElement('input').matches(selector);

        return true;
    } catch {
        return false;
    }
}

function shown(control: Control) {
    if (control.validity.valid) return false;

    return USER_INVALID ? control.matches(':user-invalid') : true;
}

/**
 * Состояние ошибки поля.
 *
 * `error` — сообщение снаружи (сервер, своя проверка). Если оно есть,
 * браузерное не показывается: снаружи знают больше.
 */
function useValidity(error?: ReactNode) {
    const [native, setNative] = useState('');
    const message = error ?? (native === '' ? undefined : native);

    return {
        /** Что показать под полем. `undefined`, если показывать нечего. */
        message,
        /** Есть ли ошибка: отсюда берётся aria-invalid и подсветка коробки. */
        invalid: message !== undefined,
        /** На событие invalid — то есть на попытку отправить форму. */
        report,
        /** На blur — тот же момент, что и у рамки :user-invalid. */
        settle,
        /** На ввод — сообщение снимается, как только поле стало верным. */
        clear,
        /**
         * Снять сообщение без обращения к полю. Нужно там, где о верности
         * известно раньше, чем она попадёт в DOM: у Select значение выбирают
         * в обработчике, а спутник проверки узнает об этом только
         * на следующей отрисовке.
         */
        drop,
    };

    function report(event: SyntheticEvent<Control>) {
        /* Гасим пузырь: тот же текст остаётся в разметке и никуда не денется. */
        event.preventDefault();
        setNative(event.currentTarget.validationMessage);
    }

    function settle(event: SyntheticEvent<Control>) {
        const control = event.currentTarget;

        setNative(shown(control) ? control.validationMessage : '');
    }

    function clear(control: Control | null) {
        if (control !== null && control.validity.valid) setNative('');
    }

    function drop() {
        setNative('');
    }
}

export {useValidity};
