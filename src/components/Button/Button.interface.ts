// Button.interface.ts
import type {ComponentPropsWithRef} from "react";

export type ButtonVariant = 'OUTLINE' | 'CONTRAST' | 'DEFAULT';

interface ButtonPropsInterface {
    variant?: ButtonVariant
    active?: boolean
    loading?: boolean
}

/** React 19: `ref` — обычный проп, forwardRef не нужен. */
export type ButtonProps = ComponentPropsWithRef<'button'> & ButtonPropsInterface
