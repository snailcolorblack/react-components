// Popover.tsx

/* -------------------------------------------------------------------------- */
/*  РАБОТА С ПОПОВЕРОМ                                                        */
/*                                                                            */
/*  Поповер — окно без затемнения: страницу не блокирует, фокус не забирает   */
/*  и не запирает внутри. Этим он отличается от Dialog, и поэтому состояние   */
/*  ему нужно куда реже.                                                      */
/*                                                                            */
/*  Открывший его элемент браузер делает якорем сам — поповер встаёт рядом    */
/*  с кнопкой без единой строчки привязки.                                    */
/* -------------------------------------------------------------------------- */

/* --- 1. Разметкой, popovertarget: основной способ ------------------------- */
/*
 *  <Button popoverTarget="user-menu">Меню</Button>
 *
 *  <Popover id="user-menu" label="Меню пользователя" role="menu">
 *      …
 *  </Popover>
 *
 *  Одна кнопка и переключает, и закрывает. Бесплатно достаётся:
 *  aria-expanded на кнопке, aria-details между ними, переход фокуса внутрь
 *  по Tab, Esc, закрытие кликом мимо и возврат фокуса на кнопку.
 *
 *  popovertarget старше команд из варианта 2 и поддержан шире — если
 *  выбирать один способ, берите этот.
 *
 *  Закрыть изнутри: popoverTargetAction="hide" на кнопке внутри поповера.
 */

/* --- 2. Разметкой, commandfor: то же самое, но общим механизмом ----------- */
/*
 *  <Button commandfor="user-menu" command="toggle-popover">Меню</Button>
 *
 *  <Popover id="user-menu" label="Меню пользователя">…</Popover>
 *
 *  commandfor говорит, НАД КАКИМ элементом действовать, command — ЧТО
 *  сделать: toggle-popover, show-popover, hide-popover. Те же атрибуты
 *  открывают и Dialog (show-modal, close), так что разметка у обоих
 *  компонентов получается одинаковая — ради этого вариант и существует.
 *
 *  Команды новее popovertarget, поддержка между движками неравномерная:
 *  там, где их нет, кнопка молча ничего не делает.
 *
 *  React про эти атрибуты ещё не знает — типы в src/types/invoker.d.ts.
 */

/* --- 3. Через ref: для popover="manual" ----------------------------------- */
/*
 *  const popoverRef = useRef<HTMLDivElement>(null);
 *
 *  <Button popoverTarget="panel">Открыть</Button>
 *
 *  <Popover id="panel" popover="manual" ref={popoverRef} label="Панель">
 *      <Button onClick={() => popoverRef.current?.hidePopover()}>Закрыть</Button>
 *  </Popover>
 *
 *  popover="manual" не закрывается ни по Esc, ни по клику мимо и не
 *  уступает место соседнему поповеру — только showPopover() и hidePopover().
 *  Нужен для панелей, которые должны пережить клик по странице.
 *
 *  У popover="auto" ref обычно лишний: всё это уже делает разметка.
 */

/* --- Состояние React здесь почти всегда лишнее ---------------------------- */
/*
 *  Открытием распоряжается браузер, и useState сюда добавляют по привычке
 *  от Dialog. Заводите состояние, только если от открытости поповера
 *  зависит остальная разметка; само окно в нём не нуждается.
 *
 *  Если состояние всё же нужно, слушайте событие toggle на самом поповере —
 *  оно приходит при любом открытии и закрытии, включая Esc и клик мимо.
 */

/* --- Что стоит помнить ---------------------------------------------------- */
/*
 *  label      — без него поповер попадает в дерево доступности безымянной
 *               группой: роль есть, названия нет.
 *  role       — по умолчанию group. Под содержимое уточняйте: dialog для
 *               окна с формой, menu для меню, listbox для списка. Учтите,
 *               что role="menu" обязывает наполнять его role="menuitem".
 *  placement  — только предпочтение: не хватит места, браузер перевернёт
 *               окно сам, а на экране уже 48rem вовсе откажется от стороны
 *               в пользу ширины. То есть inline-end на телефоне скорее
 *               всего превратится в раскладку над кнопкой — это ожидаемо.
 */
/* -------------------------------------------------------------------------- */

import type {CSSProperties} from "react";
import type {PopoverPlacement, PopoverProps} from "./Popover.interfave.ts";
import styles from './Popover.module.css'

/*
 * area   — куда встать относительно триггера;
 * origin — от какого края разворачивается появление: окно должно расти
 *          от той стороны, которой прижато к кнопке, иначе оно на глазах
 *          отъезжает от неё;
 * block / inline — на какой оси лежит зазор до кнопки. У боковой раскладки
 *          это inline, у обычной — block; отступ на чужой оси не отделяет
 *          окно от кнопки, а просто сдвигает его вбок.
 */
const PLACEMENT = {
    'block-end': {
        area: 'block-end span-inline-end', origin: 'top center',
        block: 'var(--popover-gap) 0', inline: '0',
    },
    'block-start': {
        area: 'block-start span-inline-end', origin: 'bottom center',
        block: '0 var(--popover-gap)', inline: '0',
    },
    'inline-end': {
        area: 'inline-end span-block-end', origin: 'center left',
        block: '0', inline: 'var(--popover-gap) 0',
    },
    'inline-start': {
        area: 'inline-start span-block-end', origin: 'center right',
        block: '0', inline: '0 var(--popover-gap)',
    },
} satisfies Record<PopoverPlacement, {area: string, origin: string, block: string, inline: string}>;

function Popover({
                     id,
                     popover = 'auto',
                     label,
                     placement = 'block-end',
                     anchor,
                     className = '',
                     style,
                     ...props
                 }: PopoverProps) {

    const placementStyle = {
        ...style,
        '--popover-area': PLACEMENT[placement].area,
        '--popover-origin': PLACEMENT[placement].origin,
        '--popover-margin-block': PLACEMENT[placement].block,
        '--popover-margin-inline': PLACEMENT[placement].inline,
        ...(anchor ? {'--popover-anchor': anchor} : null),
    } as CSSProperties;

    return (
        <div
            {...props}
            id={id}
            popover={popover}
            aria-label={label}
            className={`${styles.popover} ${className}`.trim()}
            style={placementStyle}
        />
    );
}

export {Popover};
