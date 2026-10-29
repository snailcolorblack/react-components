// Flow.url.ts

/* -------------------------------------------------------------------------- */
/*  ШАГ В АДРЕСЕ                                                              */
/*                                                                            */
/*  Процесс живёт в адресе, а не только в памяти. Это не украшение:           */
/*  «назад» у браузера и жест назад на телефоне — одно и то же действие,      */
/*  и пока шаг лежал в useState, оно выбрасывало из процесса целиком.         */
/*                                                                            */
/*  Переход вперёд — pushState: он кладёт запись в историю, и «назад»         */
/*  возвращает на предыдущий шаг, а не на предыдущую страницу. Возврат        */
/*  внутри процесса — history.back(), чтобы не плодить записи: иначе          */
/*  «вперёд-назад-вперёд» наращивало бы историю без конца.                    */
/*                                                                            */
/*  Остальные параметры адреса не трогаются: процесс меняет ровно свой.       */
/* -------------------------------------------------------------------------- */

/** Имя шага из адреса. */
export function stepFromUrl(param: string) {
    if (typeof window === 'undefined') return undefined;

    return new URLSearchParams(window.location.search).get(param) ?? undefined;
}

/** Положить шаг в адрес. `replace` — не добавляя запись в историю. */
export function stepToUrl(param: string, name: string, replace = false) {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);

    if (url.searchParams.get(param) === name && !replace) return;

    url.searchParams.set(param, name);

    /*
     * Состояние записи помечаем своим ключом: по нему popstate отличает
     * возврат внутри процесса от возврата на чужую страницу.
     */
    const state = {...(window.history.state as object), flowStep: name};

    if (replace) window.history.replaceState(state, '', url);
    else window.history.pushState(state, '', url);
}

/** Слушать возврат и переход вперёд в браузере. */
export function onUrlStep(param: string, hit: (name: string | undefined) => void) {
    if (typeof window === 'undefined') return () => {};

    const listen = () => hit(stepFromUrl(param));

    window.addEventListener('popstate', listen);

    return () => window.removeEventListener('popstate', listen);
}
