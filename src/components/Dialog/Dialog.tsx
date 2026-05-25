// Dialog.tsx
import {forwardRef} from "react";
import type {DialogProps} from "./Dialog.interface.ts";
import styles from './Dialog.module.css';

const Dialog = forwardRef<HTMLDialogElement, DialogProps>(
    ({className='', ...props}, ref) => (
        <dialog className={`${styles.dialog} ${className}`.trim()} ref={ref} {...props} />
    ));

Dialog.displayName = 'Dialog';
export {Dialog};