// Alert.interface.ts
import type {ComponentPropsWithRef} from "react";

export type AlertVariant = 'SUCCESS' | 'WARNING' | 'ERROR';

export type AlertProps = ComponentPropsWithRef<"div"> & {
    variant?: AlertVariant;
    live?: boolean;
};
