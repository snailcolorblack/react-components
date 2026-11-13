// focusable.ts

/* -------------------------------------------------------------------------- */
/*  ДО ЧЕГО ДОХОДИТ ТАБУЛЯЦИЯ                                                 */
/*                                                                            */
/*  Один список на весь проект. До этого их было три — в Scroll, Tooltip      */
/*  и Form, — и они расходились: где-то не было summary, где-то details,      */
/*  где-то disabled не исключался вовсе, а отрицательный tabindex ловился     */
/*  то как [tabindex="-1"], то как [tabindex^="-"]. Вопрос у всех троих       */
/*  один и тот же, значит и ответ должен быть один.                           */
/* -------------------------------------------------------------------------- */

/* --- Список собран замером, а не по памяти --------------------------------- */
/*
 *  Chromium 141, по каждому случаю: кнопка — Tab — проверяемый элемент.
 *  Сверялось, совпадает ли настоящая остановка Tab с тем, что говорит
 *  селектор. Совпало в 21 случае из 22:
 *
 *      a[href] ✓   a без href ✗   button ✓   button[disabled] ✗
 *      input ✓     input[type=hidden] ✗      input[disabled] ✗
 *      input[readonly] ✓          select ✓   textarea ✓
 *      summary ✓   details без summary ✓     label ✗
 *      [tabindex="0"] ✓           [tabindex="-1"] ✗
 *      [contenteditable] ✓        [contenteditable="false"] ✗
 *      audio[controls] ✓          video[controls] ✓          iframe ✓
 *      кнопка внутри [inert] ✗
 *
 *  Что из этого неочевидно:
 *
 *      details без summary — остановка. Браузер подставляет свой summary,
 *      но в разметке его нет, и селектор по summary такой узел пропускал;
 *
 *      input[readonly] — остановка. Только disabled выводит поле из обхода;
 *
 *      inert — не остановка, причём у всего поддерева. Поэтому в списке
 *      есть и [inert], и [inert] *: сложный селектор внутри :not()
 *      разрешён Selectors 4 и работает во всех четырёх целевых движках;
 *
 *      area[href] — единственное расхождение. В замере <map> не был
 *      привязан к картинке, поэтому область не отрисовалась и остановкой
 *      не стала. С картинкой она фокусируема, и в списке остаётся.
 */

/* --- Чего селектор не знает ------------------------------------------------ */
/*
 *  Видимость. display: none, visibility: hidden, content-visibility
 *  и нулевой размер селектором не ловятся вовсе — это раскладка.
 *  Для этого есть isFocusable ниже: он спрашивает движок.
 */
/* -------------------------------------------------------------------------- */

/** Селектор для `matches` и `querySelector`: что принимает фокус от Tab. */
export const FOCUSABLE =
    ':is(a[href], area[href], button, input, select, textarea, summary, details, '
    + '[tabindex], [contenteditable], audio[controls], video[controls], iframe)'
    + ':not(:disabled, [type="hidden"], [tabindex^="-"], [contenteditable="false"], [inert], [inert] *)';

/**
 * Можно ли увести фокус в этот элемент прямо сейчас.
 *
 * К селектору добавляется вопрос о видимости: скрытый элемент фокус
 * не примет, и попытка оставила бы фокус на `body`, то есть в начале
 * страницы. `checkVisibility` учитывает и `display: none` у предков,
 * и `content-visibility`. Где его нет — в jsdom раскладки не существует —
 * считаем элемент видимым: хуже, чем не увести фокус совсем, не будет.
 */
export function isFocusable(node: Element) {
    if (!node.matches(FOCUSABLE)) return false;

    return node.checkVisibility?.() ?? true;
}
