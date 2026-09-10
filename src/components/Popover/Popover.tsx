// Popover.tsx
import type {PopoverProps} from "./Popover.interfave.ts";
import styles from './Popover.module.css'

function Popover({
                     popover = 'auto',
                     className = '',
                     ...props
                }: PopoverProps) {
    return (
        <div
            {...props}
            popover={popover}
            className={`${styles.popover} ${className}`.trim()}
        />
    );
}

export {Popover};
