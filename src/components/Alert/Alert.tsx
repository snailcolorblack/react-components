import {forwardRef} from "react";
import type {AlertProps} from "./Alert.interface.ts";
import styles from './Alert.module.css'


const Alert = forwardRef<HTMLDivElement, AlertProps>(
    ({variant, className = "", ...props}, ref) => {

        const classes = [
            styles.alert,
            className,
            variant && styles[variant.toLowerCase()]
        ].filter(Boolean).join(' ');

        return (
            <div data-variant={variant} className={classes} ref={ref} role='alert' {...props} />
        )
    })


Alert.displayName = 'Alert'
export {Alert}