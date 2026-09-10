// Button.tsx
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
