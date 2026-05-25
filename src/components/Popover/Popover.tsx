import {forwardRef} from "react";
import type {PopoverProps} from "./Popover.interfave.ts";
import styles from './Popover.module.css'

const Popover = forwardRef<HTMLDivElement, PopoverProps>(
    ({ popover = 'auto', id, className = '', ...props }, ref) => (
        <div{...props} id={id} popover={popover} className={`${styles.popover} ${className}`.trim()} ref={ref} />
    )
);

Popover.displayName = 'Popover'
export {Popover}