// Dialog.tsx
import type {DialogProps} from "./Dialog.interface.ts";
import styles from './Dialog.module.css';

/**
 * Dialog — обёртка над нативным <dialog>.
 * Фокус-ловушка, инертность фона, закрытие по Esc и ::backdrop —
 * всё на стороне браузера при открытии через showModal().
 */
function Dialog({className = '', ...props}: DialogProps) {
    return <dialog className={`${styles.dialog} ${className}`.trim()} {...props} />;
}

export {Dialog};
