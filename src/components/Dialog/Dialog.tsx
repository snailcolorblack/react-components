// Dialog.tsx
import {useCallback, useEffect, useRef} from "react";
import type {MouseEvent} from "react";
import type {DialogProps} from "./Dialog.interface.ts";
import styles from './Dialog.module.css';

const SUPPORTS_CLOSED_BY = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;


function Dialog({
                    className = '',
                    open = false,
                    label,
                    closedBy = 'any',
                    ref,
                    ...props
                }: DialogProps) {

    const dialogRef = useRef<HTMLDialogElement>(null);
    const setDialogRef = useCallback((node: HTMLDialogElement | null) => {
        dialogRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
    }, [ref]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            {...props}
            ref={setDialogRef}
            aria-label={typeof label === 'string' ? label : props['aria-label']}
            closedby={closedBy}
            className={`${styles.dialog} ${className}`.trim()}
            onClick={handleClick}
        />
    );


    function handleClick(event: MouseEvent<HTMLDialogElement>) {
        props.onClick?.(event);
        if (SUPPORTS_CLOSED_BY || closedBy !== 'any' || event.defaultPrevented) return;
        if (event.target !== event.currentTarget) return;

        const {top, right, bottom, left} = event.currentTarget.getBoundingClientRect();
        const outside = event.clientY < top || event.clientY > bottom
            || event.clientX < left || event.clientX > right;

        if (outside) event.currentTarget.close();
    }
}

export {Dialog};
