// Button.tsx
import type {ButtonProps, ButtonVariant} from "./Button.interface.ts";
import styles from './Button.module.css'

/**
 * Карта вариантов собирается один раз на модуль: на рендере остаётся
 * чтение по ключу вместо toLowerCase() и динамического обращения к styles.
 */
const variantClass: Record<ButtonVariant, string> = {
    DEFAULT: styles.default,
    CONTRAST: styles.contrast,
    OUTLINE: styles.outline,
};

function Button({
                    className = "",
                    variant = 'DEFAULT',
                    active = false,
                    loading = false,
                    disabled,
                    ...props
                }: ButtonProps) {

    const classes = [
        styles.button,
        variantClass[variant],
        active && styles.active,
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            {...props}
            type={props.type ?? 'button'}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            data-state={active ? 'active' : undefined}
            className={classes}
        />
    );
}

export {Button};
