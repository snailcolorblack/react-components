// Input.mask.ts

/* -------------------------------------------------------------------------- */
/*  Маска и фильтр                                                            */
/*                                                                            */
/*  Отдельный файл, потому что это чистые функции без React: их удобно        */
/*  проверять по таблице «ввод → результат», и в компоненте не остаётся       */
/*  ни одной строчки разбора строк.                                           */
/*                                                                            */
/*  Договорённость одна: в маске `#` — место под символ, всё остальное —      */
/*  литералы. Литералы подставляются сами, в значение не попадают и при       */
/*  вводе игнорируются: набранное «+» на месте «+» не станет содержимым.      */
/* -------------------------------------------------------------------------- */

/** Место под символ в маске. */
export const SLOT = '#';

/** Сколько символов вмещает маска. */
export function capacity(mask: string) {
    return [...mask].filter(char => char === SLOT).length;
}

/**
 * Оставить только допустимые символы.
 *
 * Флаги g и y снимаются нарочно: они переносят lastIndex между вызовами,
 * и одна и та же регулярка через раз давала бы разный ответ на один
 * и тот же символ.
 */
export function keep(raw: string, format?: RegExp) {
    if (!format) return raw;

    const test = new RegExp(format.source, format.flags.replace(/[gy]/g, ''));

    return [...raw].filter(char => test.test(char)).join('');
}

/**
 * Снять маску: вернуть только содержательные символы.
 *
 * Маска и строка идут навстречу друг другу. Литерал, стоящий на своём
 * месте, проглатывается; всё прочее считается содержимым и занимает
 * ближайший свободный слот. Поэтому и набор по одному символу, и вставка
 * «9161234567» целиком дают один и тот же результат.
 *
 * format нужен здесь, а не только после: символ, который всё равно будет
 * отсеян, не должен занимать слот. Замерено на «+7 ### ##-##-##»: без
 * этой проверки пробел из вставленного «+7 9106 12-34-56» съедал место,
 * маска кончалась раньше строки, и две последние цифры пропадали.
 */
export function unmask(view: string, mask?: string, format?: RegExp) {
    if (!mask) return view;

    const test = format && new RegExp(format.source, format.flags.replace(/[gy]/g, ''));
    let raw = '';
    let at = 0;

    for (const char of view) {
        if (at < mask.length && mask[at] !== SLOT && mask[at] === char) {
            at += 1;
            continue;
        }
        if (test && !test.test(char)) continue;

        while (at < mask.length && mask[at] !== SLOT) at += 1;
        if (at >= mask.length) break;

        raw += char;
        at += 1;
    }

    return raw;
}

/**
 * Надеть маску. Возвращает и строку, и позиции содержательных символов
 * в ней: по ним компонент ставит каретку.
 *
 * Литералы выводятся только перед символом, который за ними следует, —
 * иначе пустое поле показывало бы «+7 (» ещё до первой цифры, а такой
 * текст спорит с плавающей подписью.
 */
export function paint(raw: string, mask?: string): {view: string, at: number[]} {
    if (!mask) return {view: raw, at: [...raw].map((_, index) => index)};

    let view = '';
    let literals = '';
    let index = 0;
    const at: number[] = [];

    for (const char of mask) {
        if (char !== SLOT) {
            literals += char;
            continue;
        }
        if (index >= raw.length) break;

        view += literals;
        at.push(view.length);
        view += raw[index];
        literals = '';
        index += 1;
    }

    return {view, at};
}

/** Привести любое значение к тому, что должно быть видно в поле. */
export function display(value: string, mask?: string, format?: RegExp) {
    const raw = keep(unmask(value, mask, format), format);

    return paint(mask ? raw.slice(0, capacity(mask)) : raw, mask);
}
