// Flow.draft.ts

/* -------------------------------------------------------------------------- */
/*  ЧЕРНОВИК                                                                  */
/*                                                                            */
/*  Процесс на несколько страниц переживает перезагрузку: данные, текущий     */
/*  шаг и пройденный путь лежат в localStorage под ключом, который дали       */
/*  снаружи.                                                                  */
/*                                                                            */
/*  Каждое обращение в try/catch, и это не перестраховка: в приватном окне    */
/*  и при запрете на данные сайта обращение к localStorage бросает            */
/*  исключение, а не возвращает пустоту. Процесс от этого падать не должен —  */
/*  черновик удобство, а не условие работы.                                   */
/* -------------------------------------------------------------------------- */

export interface Draft<T> {
    /** Данные процесса. */
    data: T;
    /** На каком шаге остановились. */
    step: string;
    /** Какие шаги уже пройдены: по ним решается, куда пускать по ссылке. */
    reached: string[];
}

export function readDraft<T>(key: string | undefined): Draft<T> | undefined {
    if (key === undefined) return undefined;

    try {
        const raw = localStorage.getItem(key);

        if (raw === null) return undefined;

        const draft = JSON.parse(raw) as Draft<T>;

        /*
         * Разбор без проверки формы опасен: ключ переживает выкладку,
         * и старый черновик легко окажется другой формы. Нам хватает
         * трёх полей — остальное пусть разбирает сам процесс.
         */
        if (typeof draft?.step !== 'string' || !Array.isArray(draft.reached)) return undefined;

        return draft;
    } catch {
        return undefined;
    }
}

export function writeDraft<T>(key: string | undefined, draft: Draft<T>) {
    if (key === undefined) return;

    try {
        localStorage.setItem(key, JSON.stringify(draft));
    } catch {
        /*
         * Место кончилось или хранилище запрещено. Молча: сказать
         * пользователю нечего, а процесс идёт дальше как ни в чём
         * не бывало — просто без черновика.
         */
    }
}

export function dropDraft(key: string | undefined) {
    if (key === undefined) return;

    try {
        localStorage.removeItem(key);
    } catch {
        /* см. выше */
    }
}
