// Dropdown.interface.ts
import type {ButtonHTMLAttributes, CSSProperties, MouseEvent, ReactElement, ReactNode} from 'react';
import type {ButtonProps} from '../Button/Button.interface.ts';
import type {PopoverPlacement, PopoverProps} from '../Popover/Popover.interfave.ts';

interface DropdownItemBase {
    /** Ключ для React. Без него берётся индекс — годится для статичного списка. */
    id?: string
    /** Класс на сам пункт — для точечной правки одного пункта. */
    className?: string
    style?: CSSProperties
    /** Подпись пункта. Она же — имя пункта для скринридера. */
    label: ReactNode
    /**
     * Иконка перед подписью и после неё. Логические стороны, как у placement:
     * в RTL iconStart сам встаёт справа. iconEnd прижат к дальнему краю
     * пункта — там обычно стрелка, «внешняя ссылка» или сочетание клавиш.
     *
     * Обе декоративные: оборачиваются в aria-hidden, имя пункта берётся
     * только из label. Если иконка несёт смысл
     * («откроется в новой вкладке»), скажите это словами в label —
     * например, визуально скрытым текстом.
     */
    iconStart?: ReactNode
    iconEnd?: ReactNode
    /**
     * Пункт виден и достижим стрелками, но не срабатывает. Ставится
     * aria-disabled, а не disabled: по APG недоступный пункт меню остаётся
     * в навигации, иначе пользователь не узнает, что он вообще есть.
     */
    disabled?: boolean
    /** Разрушительное действие: окрашивается --dropdown-danger. Только цвет. */
    danger?: boolean
    /**
     * Вызывается при выборе — кликом, Enter или пробелом. После него меню
     * закрывается, а фокус возвращается на триггер. event.preventDefault()
     * оставит меню открытым.
     */
    onSelect?: (event: MouseEvent<HTMLElement>) => void
    /**
     * Линия до или после пункта — граница группы. Рисуется отдельным
     * <div role="separator">: скринридер объявляет её, а стрелки через
     * неё перескакивают.
     *
     * Ставить можно с любой стороны любой группы: две линии подряд
     * (after у одного пункта и before у следующего) и линия у края меню
     * скрываются стилями, поэтому при сборке списка по условиям лишней
     * полосы не остаётся.
     */
    separator?: 'before' | 'after'
}

/** Действие: `<button role="menuitem">`. */
export interface DropdownAction extends DropdownItemBase {
    href?: never
}

/**
 * Переход: `<a role="menuitem">`.
 *
 * Узел остаётся ссылкой: средний клик открывает её в новой вкладке, адрес
 * копируется контекстным меню. А вот РОЛЬ подменена — скринридер объявит
 * «пункт меню», а не «ссылка», и о том, что это переход, не скажет. Так
 * устроен паттерн меню в APG: внутри `role="menu"` у детей может быть
 * только `menuitem`.
 *
 * Поэтому если «это ссылка» важно знать всем — например, список разделов
 * сайта, — меню не подходит: поставьте обычный список ссылок, хоть и
 * в попапе. Меню — для действий.
 */
export interface DropdownLink extends DropdownItemBase {
    href: string
    target?: string
    rel?: string
    download?: string | boolean
}

export type DropdownItem = DropdownAction | DropdownLink;

/**
 * Пропсы кнопки-триггера. Всё, что задаёт связь с меню, компонент ставит
 * сам, поэтому здесь это закрыто.
 */
export type DropdownTriggerProps = Omit<
    ButtonProps<'button'>,
    'children' | 'popoverTarget' | 'popoverTargetAction' | 'commandfor' | 'command' | 'aria-haspopup'
>;

/**
 * Свой триггер. Получает popovertarget, id, aria-haspopup и onClick,
 * поэтому обязан быть <button> или компонентом, который пробрасывает
 * пропсы на <button>: popovertarget по спецификации работает только
 * у кнопки. Свои id и onClick не теряются, остальное не трогается.
 */
export type DropdownTriggerElement = ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;

/** Триггер по умолчанию: Button с этим содержимым и пропсами. */
interface DefaultTrigger {
    /** Содержимое кнопки-триггера. Оно же — имя меню для скринридера. */
    trigger: ReactNode
    /**
     * Остальное для кнопки: variant, className, aria-label для иконочного
     * триггера, собственные обработчики — они не теряются.
     */
    triggerProps?: DropdownTriggerProps
    children?: never
}

/** Свой триггер целиком — вместо встроенного Button. */
interface CustomTrigger {
    children: DropdownTriggerElement
    trigger?: never
    triggerProps?: never
}

interface DropdownOwnProps {
    /** Пункты меню в порядке показа. */
    items: DropdownItem[]
    /** С какой стороны раскрываться. По умолчанию снизу. */
    placement?: PopoverPlacement
    /**
     * id меню. По умолчанию генерируется. Задайте, если на меню нужно
     * сослаться снаружи — например, открыть его ещё одной кнопкой
     * с `popovertarget`.
     *
     * Именно кнопкой с атрибутом, а не вызовом: меню держится на неявном
     * якоре, который браузер назначает элементу, открывшему поповер.
     * После `showPopover()` такого элемента нет, и меню встаёт по центру
     * экрана — замерено. Открывать программно можно, но тогда привязку
     * к кнопке придётся задавать самим через `anchor-name` и `anchor`
     * у Popover.
     */
    id?: string
}

/**
 * Меню действий: кнопка и выпадающий список.
 *
 *     <Dropdown
 *         trigger="Действия"
 *         items={[
 *             {label: 'Переименовать', onSelect: rename},
 *             {label: 'Открыть', href: '/file/1'},
 *             {label: 'Удалить', danger: true, separator: 'before', onSelect: remove},
 *         ]}
 *     />
 *
 * Свой триггер — дочерним элементом вместо trigger:
 *
 *     <Dropdown items={items}>
 *         <Button variant="OUTLINE"><Icon aria-hidden/> Действия</Button>
 *     </Dropdown>
 *
 * Остальные пропсы уходят на само меню (поповер): className, style,
 * data-атрибуты, aria-label, если подпись триггера не годится в имя.
 *
 * Для выбора значения в форме это не подходит: там нужен Select —
 * у меню нет ни value, ни name, ни «выбранного» состояния.
 */
export type DropdownProps =
    Omit<PopoverProps, 'id' | 'ref' | 'children' | 'role' | 'popover' | 'label' | 'placement' | 'anchor'>
    & DropdownOwnProps
    & (DefaultTrigger | CustomTrigger);
