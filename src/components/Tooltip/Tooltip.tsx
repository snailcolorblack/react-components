// Tooltip.tsx

/* -------------------------------------------------------------------------- */
/*  РАБОТА С ПОДСКАЗКОЙ                                                       */
/*                                                                            */
/*  Подсказка оборачивает свой триггер — в отличие от Popover, которому       */
/*  хватает атрибута popovertarget на чужой кнопке. Причина в том, что        */
/*  декларативного триггера по наведению в платформе пока нет: атрибут        */
/*  interesttarget и события interest в Chromium 141 отсутствуют, и           */
/*  наведение приходится отслеживать самим.                                    */
/* -------------------------------------------------------------------------- */

/* --- Как пишется ---------------------------------------------------------- */
/*
 *  <Tooltip text="Сохранит черновик, не отправляя форму">
 *      <Button>Сохранить</Button>
 *  </Tooltip>
 *
 *  Ровно один дочерний элемент. Он получает обработчики наведения и фокуса,
 *  aria-describedby и имя якоря, поэтому обязан пробрасывать пропсы на свой
 *  DOM-узел. Собственные onPointerEnter и onFocus у него не теряются —
 *  вызываются перед нашими.
 */

/* --- Иконочная кнопка: подсказка становится именем ------------------------ */
/*
 *  <Tooltip text="Удалить" mode="label">
 *      <Button><TrashIcon aria-hidden="true"/></Button>
 *  </Tooltip>
 *
 *  mode="label" связывает через aria-labelledby вместо describedby. Свой
 *  aria-label на кнопке при этом не нужен: скринридер прочитает имя дважды.
 */

/* --- Что делает браузер, а что мы ----------------------------------------- */
/*
 *  Браузер (popover="hint"):
 *      верхний слой, закрытие по Esc, закрытие по клику мимо, и отдельный
 *      слой относительно меню — обычный popover="auto" гасит подсказку,
 *      а подсказка открытое меню не трогает. Всё замерено в Chromium 141.
 *
 *  Мы:
 *      наведение и фокус с задержкой, удержание подсказки при наведении
 *      на неё саму, привязка к триггеру.
 *
 *  Привязку пришлось делать вручную: неявный якорь появляется только
 *  у поповера, открытого через popovertarget или commandfor. Замерено —
 *  при показе через showPopover() подсказка встаёт по центру экрана даже
 *  при наличии popovertarget. Поэтому триггеру ставится anchor-name,
 *  а подсказке — position-anchor с этим именем.
 */

/* --- Требования WCAG 1.4.13 ----------------------------------------------- */
/*
 *  К подсказкам, появляющимся по наведению, стандарт предъявляет три
 *  требования, и все три здесь выполнены:
 *
 *      наводимость — курсор можно перевести на саму подсказку, и она
 *                    не исчезнет: уход с триггера запускает отложенное
 *                    скрытие, а наведение на подсказку его отменяет;
 *      закрываемость — Esc убирает подсказку, не уводя фокус (это делает
 *                    сам popover="hint");
 *      устойчивость — подсказка не исчезает по таймеру, только когда
 *                    курсор и фокус действительно ушли.
 */

/* --- Тач-устройства -------------------------------------------------------- */
/*
 *  Показ по наведению отключён для касаний: pointerenter с pointerType
 *  "touch" игнорируется, иначе подсказка вспыхивала бы на каждом тапе
 *  и перекрывала то, по чему только что нажали.
 *
 *  Как следствие — на телефоне подсказки нет вовсе. Ничего обязательного
 *  для выполнения задачи в неё класть нельзя.
 */
/* -------------------------------------------------------------------------- */

import {cloneElement, useEffect, useId, useRef, type PointerEvent, type FocusEvent, type CSSProperties} from 'react';
import type {TooltipPlacement, TooltipProps} from './Tooltip.interface.ts';
import styles from './Tooltip.module.css';


const PLACEMENT = {
    'block-start': {
        area: 'block-start span-inline-end', origin: 'bottom center',
        block: '0 var(--tooltip-gap)', inline: '0',
    },
    'block-end': {
        area: 'block-end span-inline-end', origin: 'top center',
        block: 'var(--tooltip-gap) 0', inline: '0',
    },
    'inline-start': {
        area: 'inline-start span-block-end', origin: 'center right',
        block: '0', inline: '0 var(--tooltip-gap)',
    },
    'inline-end': {
        area: 'inline-end span-block-end', origin: 'center left',
        block: '0', inline: 'var(--tooltip-gap) 0',
    },
} satisfies Record<TooltipPlacement, {area: string, origin: string, block: string, inline: string}>;

const HIDE_DELAY = 150;

function Tooltip({
                     text,
                     children,
                     placement = 'block-start',
                     delay = 400,
                     mode = 'description',
                     className = '',
                     style,
                     ...props
                 }: TooltipProps) {

    const id = useId();
    const tooltipRef = useRef<HTMLDivElement>(null);
    const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const anchor = `--tooltip-${id.replace(/[^\w-]/g, '-')}`;
    const relation = mode === 'label' ? 'aria-labelledby' : 'aria-describedby';

    const trigger = cloneElement(children, {
        [relation]: id,
        style: {...children.props.style, anchorName: anchor} as CSSProperties,
        onPointerEnter: handleTriggerEnter,
        onPointerLeave: handleTriggerLeave,
        onFocus: handleTriggerFocus,
        onBlur: handleTriggerBlur,
    });

    const tooltipStyle = {
        ...style,
        '--tooltip-anchor': anchor,
        '--tooltip-area': PLACEMENT[placement].area,
        '--tooltip-origin': PLACEMENT[placement].origin,
        '--tooltip-margin-block': PLACEMENT[placement].block,
        '--tooltip-margin-inline': PLACEMENT[placement].inline,
    } as CSSProperties;


    useEffect(() => () => {
        clearTimeout(showTimer.current);
        clearTimeout(hideTimer.current);
    }, []);

    return (
        <>
            {trigger}
            <div
                {...props}
                id={id}
                ref={tooltipRef}
                popover="hint"
                role="tooltip"
                className={`${styles.tooltip} ${className}`.trim()}
                style={tooltipStyle}
                onPointerEnter={cancelHide}
                onPointerLeave={hideSoon}
            >
                {text}
            </div>
        </>
    );

    function show() {
        clearTimeout(hideTimer.current);
        tooltipRef.current?.showPopover();
    }

    function hide() {
        clearTimeout(showTimer.current);
        tooltipRef.current?.hidePopover();
    }

    function cancelHide() {
        clearTimeout(hideTimer.current);
    }

    function hideSoon() {
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(hide, HIDE_DELAY);
    }

    function handleTriggerEnter(event: PointerEvent<HTMLElement>) {
        children.props.onPointerEnter?.(event);
        if (event.pointerType === 'touch') return;

        clearTimeout(hideTimer.current);
        clearTimeout(showTimer.current);
        showTimer.current = setTimeout(show, delay);
    }

    function handleTriggerLeave(event: PointerEvent<HTMLElement>) {
        children.props.onPointerLeave?.(event);
        clearTimeout(showTimer.current);
        hideSoon();
    }

    function handleTriggerFocus(event: FocusEvent<HTMLElement>) {
        children.props.onFocus?.(event);
        if (!event.target.matches(':focus-visible')) return;

        show();
    }

    function handleTriggerBlur(event: FocusEvent<HTMLElement>) {
        children.props.onBlur?.(event);
        hide();
    }
}

export {Tooltip};
