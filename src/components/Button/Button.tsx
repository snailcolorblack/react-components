// Button.tsx

/* -------------------------------------------------------------------------- */
/*  РАБОТА С КНОПКОЙ                                                          */
/*                                                                            */
/*  Обычная <button> с тремя вариантами оформления, двумя размерами и          */
/*  состоянием загрузки. type по умолчанию button, а не submit: кнопка внутри  */
/*  формы не должна отправлять её нечаянно — отправляющую помечайте явно,      */
/*  <Button type="submit">.                                                    */
/* -------------------------------------------------------------------------- */

/* --- 1. Варианты и размеры ------------------------------------------------ */
/*
 *  <Button>Сохранить</Button>                        // DEFAULT, заливка акцентом
 *  <Button variant="OUTLINE">Отмена</Button>         // только рамка и подпись
 *  <Button variant="CONTRAST">Далее</Button>         // светлая заливка
 *
 *  <Button size="FULL">На всю ширину</Button>        // FIT по умолчанию
 *
 *  Осторожно с именами классов в CSS: size="FIT" использует класс .fill,
 *  а size="FULL" — класс .full. Названия почти совпадают и означают разное.
 */

/* --- 2. Загрузка ---------------------------------------------------------- */
/*
 *  <Button loading>Сохранить</Button>
 *
 *  Клик гасится, но кнопка НЕ получает disabled. Это намеренно: disabled
 *  выбрасывает элемент из порядка табуляции, и фокус в момент нажатия
 *  улетает в начало документа — пользователь клавиатуры теряет место.
 *  Вместо этого ставится aria-disabled, а обработчик отбивает клик сам.
 *  Замерено: role=button, disabled=true, busy=1, focusable=true — кнопка
 *  остаётся достижимой.
 *
 *  Подпись на время загрузки прячется через opacity, а не visibility или
 *  удалением из разметки: скрытый текст выпал бы из дерева доступности,
 *  и кнопка осталась бы без имени. Замерено — имя сохраняется. Заодно
 *  ширина кнопки не скачет.
 *
 *  Настоящий disabled тоже работает и означает другое: действие недоступно,
 *  а не выполняется.
 */

/* --- 3. Активное состояние ------------------------------------------------ */
/*
 *  <Button active>Сегодня</Button>
 *
 *  Только оформление, заливка как у DEFAULT. Семантики «выбрано» здесь нет:
 *  если кнопка переключатель, добавьте aria-pressed, если вкладка —
 *  role="tab" с aria-selected. Один лишь внешний вид скринридеру не виден.
 */

/* --- 4. Свои цвета -------------------------------------------------------- */
/*
 *  <Button style={{'--button-accent': 'var(--purple-color-100)',
 *                  '--button-accent-contrast': 'var(--contrast-color)'}}>…</Button>
 *
 *  Акцент задаётся парой: заливка и цвет подписи на ней. Порознь их менять
 *  нельзя — на ярком зелёном светлая подпись даёт 2.5:1. Ховер выводится
 *  сам: он подмешивает в заливку цвет её же подписи, поэтому тёмная заливка
 *  светлеет, а светлая темнеет.
 */

/* --- 5. Кнопка как триггер ------------------------------------------------ */
/*
 *  Открыть поповер или диалог можно разметкой, без состояния и обработчиков:
 *
 *      <Button popoverTarget="menu">Меню</Button>
 *      <Button commandfor="confirm" command="show-modal">Удалить</Button>
 *
 *  Подробности — в шапках Popover.tsx и Dialog.tsx.
 */
/* -------------------------------------------------------------------------- */

import type {MouseEvent} from "react";
import type {ButtonProps, ButtonSize, ButtonVariant} from "./Button.interface.ts";
import styles from './Button.module.css'

const VARIANT_CLASS = {
    DEFAULT: styles.default,
    CONTRAST: styles.contrast,
    OUTLINE: styles.outline,
} satisfies Record<ButtonVariant, string>;
const SIZE_CLASS = {
    FIT: styles.fill,
    FULL: styles.full,
} satisfies Record<ButtonSize, string>;


function Button({
                    className = "",
                    size = 'FIT',
                    variant = 'DEFAULT',
                    active = false,
                    loading = false,
                    disabled = false,
                    onClick,
                    children,
                    ...props
                }: ButtonProps) {

    const classes = [styles.button, VARIANT_CLASS[variant], SIZE_CLASS[size], className,].filter(Boolean).join(' ');


    return (
        <button
            {...props}
            type={props.type ?? 'button'}
            disabled={disabled}
            aria-disabled={loading || undefined}
            aria-busy={loading || undefined}
            data-state={active ? 'active' : undefined}
            className={classes}
            onClick={handleClick}
        >
            <span className={styles.label}>{children}</span>
            {loading && <span className={styles.spinner} aria-hidden="true"/>}
        </button>
    );

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        if (loading) {
            event.preventDefault();

            return;
        }
        onClick?.(event);
    }

}

export {Button};
