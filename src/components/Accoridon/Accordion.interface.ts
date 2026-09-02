// Accordion.interface.ts
import type {ComponentPropsWithoutRef, ReactNode} from "react";

// export interface AccordionContextValue {
//     id: string;
// }

export type AccordionProps = ComponentPropsWithoutRef<"details">

export interface AccordionHeaderProps extends ComponentPropsWithoutRef<"summary"> {
    icon?: ReactNode;
}

export type AccordionContentProps = ComponentPropsWithoutRef<"div">;