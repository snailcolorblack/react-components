// Popover.interfave.ts
import type {ComponentPropsWithRef} from 'react';

interface PopoverOwnProps {
    /** Обязателен: на него ссылается popovertarget у триггера. */
    id: string;
    popover?: 'auto' | 'manual' | 'hint';
    // type?: 'POPOVER' | 'TOOLTIP'
}

/** React 19: `ref` — обычный проп, forwardRef не нужен. */
export type PopoverProps =
    Omit<ComponentPropsWithRef<'div'>, 'id' | 'popover'> & PopoverOwnProps;
