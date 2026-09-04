// Accordion.tsx
import type {AccordionProps, AccordionHeaderProps, AccordionContentProps} from "./Accordion.interface.ts";
import {plusIcon} from "../../assets/icons/icon.tsx";
import styles from "./Accordion.module.css";


function Accordion({className = '', children, ...props}: AccordionProps) {
    return (
        <details className={`${styles.accordion} ${className}`.trim()} {...props}>
            {children}
        </details>
    )
}

function AccordionHeader({icon, as: Title = 'span', className = '', children, ...props}: AccordionHeaderProps) {
    return (
        <summary className={`${styles.accordion_header} ${className}`.trim()} {...props}>
            <Title className={styles.accordion_header__title}>{children}</Title>
            <div className={styles.icon} aria-hidden="true">
                {icon ?? plusIcon}
            </div>
        </summary>
    );
}

function AccordionContent({className = '', children, ...props}: AccordionContentProps) {
    return (
        <div className={`${styles.accordion_content} ${className}`.trim()} {...props}>
            {children}
        </div>
    );
}

export {Accordion, AccordionHeader, AccordionContent};
