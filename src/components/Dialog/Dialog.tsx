// Dialog.tsx

/* -------------------------------------------------------------------------- */
/*  РАБОТА С ДИАЛОГОМ                                                         */
/*                                                                            */
/*  Диалог всегда модальный: под ним showModal(), а значит top layer,         */
/*  ::backdrop, ловушка фокуса, Esc и возврат фокуса на триггер.              */
/*                                                                            */
/*  Режим определяется одним: передан проп open или нет.                      */
/* -------------------------------------------------------------------------- */

/* --- 1. Управляемый: открытием распоряжается React ------------------------ */
/*
 *  const [open, setOpen] = useState(false);
 *  const close = () => setOpen(false);
 *
 *  <Button onClick={() => setOpen(true)}>Открыть</Button>
 *
 *  <Dialog open={open} onClose={close} label="Окно">
 *      <Button onClick={close}>Закрыть</Button>
 *  </Dialog>
 *
 *  onClose обязателен. Диалог закрывается и помимо вашей кнопки — по Esc,
 *  по клику в затемнение, — а React об этом не узнает: состояние останется
 *  true, и повторное открытие не сработает. onClose это и чинит: браузер
 *  шлёт событие close при любом закрытии, а вы им гасите состояние.
 *
 *  Несколько окон на странице не требуют нескольких useState. Одно
 *  состояние с типом окна читается лучше:
 *      const [dialog, setDialog] = useState<'edit' | 'remove' | null>(null);
 *      <Dialog open={dialog === 'edit'} onClose={close} …>
 *
 *  Работает везде: это обычный React, без новых возможностей платформы.
 */

/* --- 2. Неуправляемый, разметкой: open не передан ------------------------- */
/*
 *  <Button commandfor="confirm" command="show-modal">Удалить</Button>
 *
 *  <Dialog id="confirm" label="Подтверждение">
 *      <Button commandfor="confirm" command="close">Отмена</Button>
 *  </Dialog>
 *
 *  Ни состояния, ни обработчиков. commandfor говорит, НАД КАКИМ элементом
 *  действовать, command — ЧТО сделать: show-modal, close, request-close.
 *
 *  Этим же механизмом открывается и поповер (toggle-popover), так что
 *  разметка у обоих компонентов одинаковая. Отдельного dialogtarget
 *  в HTML нет — popovertarget умеет только поповеры.
 *
 *  Атрибут пишется в нижнем регистре — commandfor, не commandFor. React 19.2
 *  про него не знает, и camelCase он принимает за неизвестный проп: в dev
 *  это предупреждение в консоли, в production тишина, потому что там такие
 *  проверки вырезаны. В нижнем регистре React отдаёт атрибут в DOM как есть.
 *
 *  Осторожно: команды новее popovertarget, поддержка между движками
 *  неравномерная, и там, где их нет, кнопка молча ничего не делает.
 *  Для критичных сценариев берите вариант 1.
 *
 *  Типы атрибутов добавлены в src/types/invoker.d.ts.
 */

/* --- 3. Неуправляемый, через ref: open не передан ------------------------- */
/*
 *  const dialogRef = useRef<HTMLDialogElement>(null);
 *
 *  <Button onClick={() => dialogRef.current?.showModal()}>Открыть</Button>
 *
 *  <Dialog ref={dialogRef} label="Окно">
 *      <Button onClick={() => dialogRef.current?.close()}>Закрыть</Button>
 *  </Dialog>
 *
 *  Нужен там, где открытие — побочный эффект чужой логики: после ответа
 *  сервера, по таймеру, из обработчика вне разметки. Состояния нет,
 *  лишних перерисовок тоже.
 *
 *  Смешивать с open не стоит: если open передан, он и решает, а вызов
 *  showModal() мимо него разъедется с состоянием React.
 */

/* --- Чем закрывается ------------------------------------------------------ */
/*
 *  <form method="dialog">  — сабмит закрывает окно и кладёт value кнопки
 *                            в dialog.returnValue. Нативно, без JS.
 *  command="close"         — из разметки.
 *  ref.current.close()     — программно.
 *  Esc                     — всегда, если closedBy не 'none'.
 *  Клик в затемнение       — при closedBy="any" (по умолчанию).
 *
 *  Любое из них поднимает событие close, то есть вызывает ваш onClose.
 */
/* -------------------------------------------------------------------------- */

import {useCallback, useEffect, useRef} from "react";
import type {MouseEvent} from "react";
import type {DialogProps} from "./Dialog.interface.ts";
import styles from './Dialog.module.css';

const SUPPORTS_CLOSED_BY = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;


function Dialog({
                    className = '',
                    open,
                    label,
                    closedBy = 'any',
                    ref,
                    ...props
                }: DialogProps) {

    const dialogRef = useRef<HTMLDialogElement>(null);
    const setDialogRef = useCallback((node: HTMLDialogElement | null) => {
        dialogRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
    }, [ref]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open === undefined) return;

        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            {...props}
            ref={setDialogRef}
            aria-label={typeof label === 'string' ? label : props['aria-label']}
            closedby={closedBy}
            className={`${styles.dialog} ${className}`.trim()}
            onClick={handleClick}
        />
    );


    function handleClick(event: MouseEvent<HTMLDialogElement>) {
        props.onClick?.(event);
        if (SUPPORTS_CLOSED_BY || closedBy !== 'any' || event.defaultPrevented) return;
        if (event.target !== event.currentTarget) return;

        const {top, right, bottom, left} = event.currentTarget.getBoundingClientRect();
        const outside = event.clientY < top || event.clientY > bottom
            || event.clientX < left || event.clientX > right;

        if (outside) event.currentTarget.close();
    }
}

export {Dialog};
