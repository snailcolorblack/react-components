import type {ComponentPropsWithoutRef} from "react";

export type AlertProps = ComponentPropsWithoutRef<"div"> & {
    variant?: 'SUCCESS' | 'WARNING' | 'ERROR'
}