// Popover.tsx
import type {PopoverProps} from "./Popover.interfave.ts";
import styles from './Popover.module.css'

/**
 * Popover — обёртка над Popover API.
 * Слой top-layer, светлое закрытие по клику вне и Esc, связь с триггером
 * через popovertarget — всё нативное, без обработчиков и состояния.
 */
function Popover({popover = 'auto', className = '', ...props}: PopoverProps) {
    return (
        <div
            {...props}
            popover={popover}
            className={`${styles.popover} ${className}`.trim()}
        />
    );
}

export {Popover};
