// Button.interface.ts
import type {ComponentPropsWithRef} from "react";

export type ButtonVariant = 'OUTLINE' | 'CONTRAST' | 'DEFAULT';
export type ButtonSize = 'FULL' | 'FIT';

interface ButtonPropsInterface {
    variant?: ButtonVariant
    size?:  ButtonSize
    active?: boolean
    loading?: boolean
}

export type ButtonProps = ComponentPropsWithRef<'button'> & ButtonPropsInterface
