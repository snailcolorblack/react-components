// Accordion.tsx
import {forwardRef} from "react";
import type {
    AccordionProps,
    AccordionHeaderProps,
    AccordionContentProps
} from "./Accordion.interface.ts";
import styles from "./Accordion.module.css";

// const AccordionContext = createContext<AccordionContextValue | undefined>(undefined);
//
// const useAccordion = () => {
//     const ctx = useContext(AccordionContext);
//     if (!ctx) throw new Error("AccordionHeader/Content must be used within <Accordion>");
//     return ctx;
// };
//
// const Accordion = forwardRef<HTMLDetailsElement, AccordionProps>(
//     ({name, open, className = "", children, ...props}, ref) => {
//         const id = useId();
//
//         return (
//             <AccordionContext.Provider value={{id}}>
//                 <details
//                     ref={ref}
//                     className={`${styles.accordion} ${className}`.trim()}
//                     name={name}
//                     open={open}
//                     {...props}
//                 >
//                     {children}
//                 </details>
//             </AccordionContext.Provider>
//         );
//     },
// );
//
// const AccordionHeader = forwardRef<HTMLElement, AccordionHeaderProps>(
//     ({icon, className = "", children, ...props}, ref) => {
//         const {id} = useAccordion();
//
//         return (
//             <summary
//                 ref={ref}
//                 id={`${id}-summary`}
//                 aria-controls={`${id}-content`}
//                 className={`${styles.accordion_header} ${className}`.trim()}
//                 {...props}
//             >
//                 <span className={styles.accordion_header_text}>{children}</span>
//                 {icon ?? (
//                     <svg
//                         className={styles.base_svg}
//                         width="24" height="24" viewBox="0 0 24 24"
//                         fill="none" aria-hidden="true"
//                         xmlns="http://www.w3.org/2000/svg"
//                     >
//                         <path d="M12 19.1037V4.89258" stroke="var(--font-color)" strokeWidth="2" strokeLinecap="round"/>
//                         <path d="M4.89432 12L19.1055 12" stroke="var(--font-color)" strokeWidth="2" strokeLinecap="round"/>
//                     </svg>
//                 )}
//             </summary>
//         );
//     },
// );
//
// const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
//     ({className = "", children, ...props}, ref) => {
//         const {id} = useAccordion();
//
//         return (
//             <div
//                 ref={ref}
//                 id={`${id}-content`}
//                 role="region"
//                 aria-labelledby={`${id}-summary`}
//                 className={`${styles.accordion_content} ${className}`.trim()}
//                 {...props}
//             >
//                 {children}
//             </div>
//         );
//     },
// );

const Accordion = forwardRef<HTMLDetailsElement, AccordionProps>(
    ({name, onOpenChange, onToggle, open, className = '', children, ...props}, ref) => (
        <details
            ref={ref}
            className={`${styles.accordion} ${className}`.trim()}
            name={name}
            open={open}
            onToggle={(event) => {
                onToggle?.(event);
                onOpenChange?.(event.currentTarget.open);
            }}
            {...props}
        >
            {children}
        </details>
    ),
);

const AccordionHeader = forwardRef<HTMLElement, AccordionHeaderProps>(
    ({icon, className = '', children, ...props}, ref) => (
        <summary
            ref={ref}
            className={`${styles.accordion_header} ${className}`.trim()}
            {...props}
        >
            <span>{children}</span>
            {icon ??
                <svg
                    className={styles.base_svg}
                    width="24" height="24" viewBox="0 0 24 24"
                    fill="none" aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M12 19.1037V4.89258" stroke="var(--font-color)" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M4.89432 12L19.1055 12" stroke="var(--font-color)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
            }
        </summary>
    ),
);

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
    ({className = '', children, ...props}, ref) => (
        <div
            ref={ref}
            className={`${styles.accordion_content} ${className}`.trim()}
            {...props}
        >
            {children}
        </div>
    ),
);

Accordion.displayName = "Accordion";
AccordionHeader.displayName = "AccordionHeader";
AccordionContent.displayName = "AccordionContent";

export {Accordion, AccordionHeader, AccordionContent};