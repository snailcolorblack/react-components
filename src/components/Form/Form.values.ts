// Form.values.ts

/* -------------------------------------------------------------------------- */
/*  ЗНАЧЕНИЯ ФОРМЫ                                                            */
/*                                                                            */
/*  Сбор и поиск поля. Отдельным файлом, потому что это чистые функции        */
/*  без React: их можно проверять и читать сами по себе.                      */
/* -------------------------------------------------------------------------- */

import type {FormValue, FormValues} from './Form.interface.ts';

/**
 * Значения формы объектом.
 *
 * Повторяющееся имя — не ошибка, а обычное дело: группа чекбоксов,
 * `Select` с несколькими значениями, список получателей. Такое имя
 * отдаётся массивом, одиночное — как есть. Разбирать `FormData`
 * вручную после этого не приходится.
 */
function collect(form: HTMLFormElement): FormValues {
    const data = new FormData(form);
    const values: FormValues = {};

    for (const [name, value] of data.entries()) {
        const was = values[name];

        if (was === undefined) {
            values[name] = value as FormValue;

            continue;
        }

        values[name] = (Array.isArray(was) ? [...was, value] : [was, value]) as FormValue;
    }

    return values;
}

/**
 * Куда вести фокус при ошибке в поле `name`.
 *
 * Поиск по имени годится не всегда, и это замерено на `Select`:
 * значение там несут скрытые `<input type="hidden">`, которые
 * не фокусируются, а когда не выбрано ничего — а это и есть случай
 * ошибки «выберите город» — элемента с таким именем в форме нет
 * вовсе. Фокус тогда оставался на `body`, то есть в начале страницы.
 *
 * Поэтому три попытки по убыванию точности: сам элемент с этим
 * именем; фокусируемый рядом с ним; и первое поле, помеченное
 * `aria-invalid` — его ставят сами поля, когда им передали ошибку.
 */
function reach(form: HTMLFormElement, name: string): HTMLElement | undefined {
    const named = form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);

    if (named !== null && focusable(named)) return named;

    if (named !== null) {
        /* Группа поля: ближайший общий предок подписи, ввода и ошибки.
           Внутри неё и живёт то, что человек нажимает. */
        const group = named.closest<HTMLElement>('label, fieldset, [data-field]');
        const inside = group?.querySelector<HTMLElement>(FOCUSABLE);

        if (inside != null) return inside;
    }

    return [...form.querySelectorAll<HTMLElement>('[aria-invalid="true"]')].find(focusable);
}

const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex^="-"])',
].join(', ');

function focusable(node: HTMLElement) {
    if (node.matches('[type="hidden"], [hidden], [disabled]')) return false;

    /*
     * Скрытый элемент фокус не принимает, и попытка его увести оставила
     * бы фокус на body, то есть в начале страницы. Спрашиваем у движка:
     * checkVisibility учитывает и display: none у предков, и content-
     * visibility. Где его нет (в jsdom раскладки нет вовсе), считаем
     * элемент видимым — хуже, чем не увести фокус совсем, не будет.
     */
    return node.checkVisibility?.() ?? true;
}

export {collect, reach};
