import {type ComponentPropsWithRef} from 'react';

interface PopoverOwnProps {
    id: string;
    popover?: 'auto' | 'manual' | 'hint';
    // type?: 'POPOVER' | 'TOOLTIP'
}

export type PopoverProps = Omit<ComponentPropsWithRef<'div'>, 'id' | 'popover'> & PopoverOwnProps;
