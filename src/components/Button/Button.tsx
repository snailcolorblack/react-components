import {forwardRef} from "react";
import type {ButtonProps} from "./Button.interface.ts";
import styles from './Button.module.css'

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant='DEFAULT', active=false, loading, ...props }, ref) => {

        const classes = [
            styles.button,
            className,
            active && styles.active,
            variant && styles[variant.toLowerCase()]
        ].filter(Boolean).join(' ');

        return (
            <button {...props} ref={ref} disabled={props.disabled || loading} className={classes} data-state={!active ? undefined : 'active'}/>
        );
    }
);

Button.displayName = 'Button';
export { Button };