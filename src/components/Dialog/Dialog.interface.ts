// Dialog.interface.ts
import type {ComponentPropsWithRef} from 'react';

/** React 19: `ref` — обычный проп, forwardRef не нужен. */
export type DialogProps = ComponentPropsWithRef<'dialog'>;
