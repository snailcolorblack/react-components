// Accordion.interface.ts
import type {ComponentPropsWithoutRef, ReactNode} from "react";

export interface AccordionContextValue {
    id: string;
}

export interface AccordionProps extends ComponentPropsWithoutRef<"details"> {
    name?: string;
}

export interface AccordionHeaderProps extends ComponentPropsWithoutRef<"summary"> {
    icon?: ReactNode;
}

export type AccordionContentProps = ComponentPropsWithoutRef<"div">;