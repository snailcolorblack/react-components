import type {ComponentPropsWithoutRef} from "react";

interface ButtonPropsInterface {
    variant?: 'OUTLINE' | 'CONTRAST' | 'DEFAULT'
    active?: boolean
    loading?: boolean
}

export type ButtonProps = ComponentPropsWithoutRef<'button'> & ButtonPropsInterface
