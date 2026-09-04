// Alert.tsx
import type {AlertProps} from "./Alert.interface.ts";
import styles from './Alert.module.css';

function Alert ({variant, live = false, className = "", ...props}: AlertProps) {
    const role = live ? (variant === 'ERROR' ? 'alert' : 'status') : undefined;

    return (
        <div data-variant={variant} className={className ? `${styles.alert} ${className}` : styles.alert} role={role}{...props}/>
    );
}

export {Alert};
