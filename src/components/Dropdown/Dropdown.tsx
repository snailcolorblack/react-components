// Dropdown.tsx

/* -------------------------------------------------------------------------- */
/*  РАБОТА С МЕНЮ                                                             */
/*                                                                            */
/*  Кнопка и выпадающий список действий — паттерн «menu button» из APG.       */
/*  Один компонент и массив пунктов: ни провайдера, ни Dropdown.Item —        */
/*  разметка пункта жёстко задана ролью menuitem, и отдавать её наружу        */
/*  значит дать собрать меню, которое скринридер прочитает неправильно.       */
/* -------------------------------------------------------------------------- */

/* --- Как пишется ---------------------------------------------------------- */
/*
 *  <Dropdown
 *      trigger="Действия"
 *      triggerProps={{variant: 'OUTLINE'}}
 *      items={[
 *          {label: 'Переименовать', onSelect: rename},
 *          {label: 'Скачать', href: '/file.pdf', download: true},
 *          {label: 'Удалить', danger: true, separator: 'before', onSelect: remove},
 *      ]}
 *  />
 *
 *  Пункт с href — ссылка (<a role="menuitem">), без него — кнопка.
 *  Иконочный триггер: trigger={<Icon aria-hidden/>} и
 *  triggerProps={{'aria-label': 'Ещё'}} — это имя получит и меню.
 */

/* --- Свой триггер --------------------------------------------------------- */
/*
 *  <Dropdown items={items}>
 *      <Button variant="OUTLINE"><Icon aria-hidden/> Действия</Button>
 *  </Dropdown>
 *
 *  Дочерний элемент заменяет встроенный Button целиком — как у Tooltip.
 *  Он обязан отрисовать <button>: popovertarget по спецификации работает
 *  только у кнопки, на ссылке или div он молча ничего не делает. Свои
 *  id и onClick у него не теряются, остальные пропсы не трогаются.
 */

/* --- Оформление ----------------------------------------------------------- */
/*
 *  Переменные — на самом меню:
 *      <Dropdown style={{'--popover-bg': 'var(--base-color-300)',
 *                        '--dropdown-danger': 'var(--warning-color)'}}/>
 *
 *  Значением может быть цвет или другая переменная, но не inherit:
 *  у пользовательского свойства это значит «унаследовать саму переменную»,
 *  а не цвет.
 *
 *  Всё остальное — своими правилами. У правил пунктов вес ровно один
 *  класс, состояния (:hover, :focus) веса не добавляют, поэтому правило
 *  «класс меню + роль» побеждает без !important. Цепляться удобно
 *  за роли — они стабильны, в отличие от хэшированных классов модуля:
 *
 *      .menu [role="separator"]           { display: none }
 *      .menu [role="menuitem"]            { color: var(--accent-color) }
 *      .menu [role="menuitem"]:last-child { font-weight: 600 }
 *
 *  Точечно — className и style у самого пункта в items.
 */

/* --- Что делает браузер, а что мы ----------------------------------------- */
/*
 *  Браузер (popovertarget + popover="auto"):
 *      открытие и закрытие по клику, Enter и пробелу на триггере;
 *      aria-expanded на триггере; Esc и клик мимо; верхний слой — меню
 *      не обрезается overflow: hidden у родителей и не спорит с z-index;
 *      возврат фокуса на триггер при закрытии; привязка к триггеру —
 *      открывший поповер элемент становится его якорем сам.
 *
 *  CSS (anchor positioning, из Popover):
 *      место у кнопки и переворот у края экрана, без замеров в JS.
 *
 *  Мы — только обязательное для меню по APG, чего у платформы нет:
 *      фокус внутрь при открытии; стрелки и Home/End; закрытие по Tab
 *      и после выбора пункта.
 *
 *  Состояния React нет вовсе: открытость живёт в браузере, фокус — в DOM.
 *  Открытие, закрытие и навигация не вызывают ни одной перерисовки.
 */

/* --- Клавиатура ----------------------------------------------------------- */
/*
 *  На триггере:  Enter / пробел — открыть, фокус на первый пункт.
 *  Мышью:        открыть, фокус на само меню, ни один пункт не подсвечен —
 *                пользователь ещё ничего не выбрал; ↓ / ↑ дальше начинают
 *                с края. APG требует фокус на первом пункте именно для
 *                клавиатуры.
 *  В меню:       ↑ ↓ — по кругу; Home / End — к краю; Enter — выбрать;
 *                Esc — закрыть и вернуться на триггер; Tab — закрыть
 *                и уйти дальше по странице.
 *
 *  Необязательное по APG намеренно не сделано: открытие стрелками
 *  на триггере, поиск по первой букве, пробел на пункте-ссылке. Каждое
 *  стоило своего обработчика, а без них меню остаётся полностью
 *  доступным с клавиатуры.
 *
 *  Пункты вне порядка табуляции (tabindex="-1"): по APG меню — один
 *  шаг Tab, внутри ходят стрелками.
 */
/* -------------------------------------------------------------------------- */

import {cloneElement, Fragment, useId, useRef, type KeyboardEvent, type MouseEvent, type ToggleEvent} from 'react';
import {Button} from '../Button/Button.tsx';
import {Popover} from '../Popover/Popover.tsx';
import type {DropdownItem, DropdownProps} from './Dropdown.interface.ts';
import styles from './Dropdown.module.css';

const ITEM_SELECTOR = '[role="menuitem"]';

function Dropdown({
                      trigger,
                      items,
                      triggerProps,
                      children,
                      placement = 'block-end',
                      id,
                      className = '',
                      onKeyDown,
                      onToggle,
                      ...props
                  }: DropdownProps) {

    const generatedId = useId();
    const menuRef = useRef<HTMLDivElement>(null);
    const openedByKeyboard = useRef(true);

    const menuId = id ?? generatedId;
    const triggerId = (children ? children.props.id : triggerProps?.id) ?? `${menuId}-trigger`;
    const named = props['aria-label'] !== undefined || props['aria-labelledby'] !== undefined;
    const link = {
        id: triggerId,
        popoverTarget: menuId,
        'aria-haspopup': 'menu',
        onClick: handleTriggerClick,
    } as const;

    return (
        <>
            {children
                ? cloneElement(children, link)
                : <Button {...triggerProps} {...link}>{trigger}</Button>}
            <Popover
                {...props}
                id={menuId}
                ref={menuRef}
                role="menu"
                tabIndex={-1}
                label={props['aria-label']}
                aria-labelledby={named ? props['aria-labelledby'] : triggerId}
                placement={placement}
                className={`${styles.menu} ${className}`.trim()}
                onKeyDown={handleMenuKeyDown}
                onToggle={handleToggle}
            >
                {items.map(renderItem)}
            </Popover>
        </>
    );

    function renderItem(item: DropdownItem, index: number) {
        const common = {
            role: 'menuitem',
            tabIndex: -1,
            'aria-disabled': item.disabled || undefined,
            className: [styles.item, item.danger && styles.danger, item.className].filter(Boolean).join(' '),
            style: item.style,
            onClick: (event: MouseEvent<HTMLElement>) => handleSelect(item, event),
        } as const;
        const separator = <div role="separator" className={styles.separator}/>;
        const content = (
            <>
                {item.iconStart && <span className={styles.icon} aria-hidden="true">{item.iconStart}</span>}
                <span className={styles.label}>{item.label}</span>
                {item.iconEnd && <span className={styles.icon} aria-hidden="true">{item.iconEnd}</span>}
            </>
        );

        return (
            <Fragment key={item.id ?? index}>
                {item.separator === 'before' && separator}
                {item.href !== undefined
                    ? (
                        <a {...common} href={item.href} target={item.target} rel={item.rel} download={item.download}>
                            {content}
                        </a>
                    )
                    : <button {...common} type="button">{content}</button>}
                {item.separator === 'after' && separator}
            </Fragment>
        );
    }

    function handleSelect(item: DropdownItem, event: MouseEvent<HTMLElement>) {
        if (item.disabled) {
            event.preventDefault();

            return;
        }
        item.onSelect?.(event);
        if (event.defaultPrevented) return;

        menuRef.current?.hidePopover();
    }

    function handleTriggerClick(event: MouseEvent<HTMLButtonElement>) {
        (children ? children.props : triggerProps)?.onClick?.(event);
        openedByKeyboard.current = event.detail === 0;
    }

    function handleToggle(event: ToggleEvent<HTMLDivElement>) {
        onToggle?.(event);
        if (event.newState !== 'open') return;

        const target = openedByKeyboard.current ? menuItems()[0] : menuRef.current;
        target?.focus();
    }

    function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;

        const list = menuItems();
        const current = list.indexOf(document.activeElement as HTMLElement);
        const last = list.length - 1;
        const next = {
            ArrowDown: current >= last ? 0 : current + 1,
            ArrowUp: current <= 0 ? last : current - 1,
            Home: 0,
            End: last,
        }[event.key];

        if (next !== undefined) {
            event.preventDefault();
            list[next]?.focus();

            return;
        }
        if (event.key === 'Tab') menuRef.current?.hidePopover();
    }

    function menuItems() {
        return Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    }
}

export {Dropdown};
