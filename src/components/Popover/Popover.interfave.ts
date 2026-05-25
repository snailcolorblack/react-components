import {type ComponentPropsWithoutRef} from 'react';

interface PopoverOwnProps {
    id: string;
    popover?: 'auto' | 'manual' | 'hint';
    // type?: 'POPOVER' | 'TOOLTIP'
}

export type PopoverProps = Omit<ComponentPropsWithoutRef<'div'>, 'id' | 'popover'> & PopoverOwnProps;