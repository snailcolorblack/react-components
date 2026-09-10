// Accordion.interface.ts
import type {ComponentPropsWithRef, ReactNode} from "react";

export type AccordionProps = ComponentPropsWithRef<"details">;

export type AccordionTitleTag =
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'p' | 'span'
    | 'div';


export interface AccordionHeaderProps extends ComponentPropsWithRef<"summary"> {
    icon?: ReactNode;
    as?: AccordionTitleTag;
}

export type AccordionContentProps = ComponentPropsWithRef<"div">;
