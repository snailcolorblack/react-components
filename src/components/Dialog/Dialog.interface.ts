// Dialog.interface.ts
import type {ComponentPropsWithRef, ReactNode} from 'react';

export type DialogClosedBy = 'any' | 'closerequest' | 'none';

export interface DialogProps extends Omit<ComponentPropsWithRef<'dialog'>, 'open'> {
    open?: boolean
    label?: ReactNode
    closedBy?: DialogClosedBy
}
