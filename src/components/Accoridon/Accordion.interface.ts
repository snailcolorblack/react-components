// Accordion.interface.ts
import type {ComponentPropsWithRef, ReactNode} from "react";

/**
 * Корень аккордеона — нативный <details>.
 * Наследует все атрибуты, включая `name` (эксклюзивные группы) и `open`.
 * React 19: `ref` приходит обычным пропсом, forwardRef не нужен.
 */
export type AccordionProps = ComponentPropsWithRef<"details">;

/**
 * Тег, в который оборачивается текст внутри <summary>.
 * Спецификация HTML разрешает единственный заголовок как содержимое <summary>,
 * поэтому h1…h6 здесь валидны и дают аккордеону место в карте заголовков
 * страницы для скринридеров (рекомендация WAI-ARIA APG).
 */
export type AccordionTitleTag =
    | 'span' | 'div' | 'p'
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface AccordionHeaderProps extends ComponentPropsWithRef<"summary"> {
    /** Кастомная иконка. По умолчанию — плюс, поворачивающийся в крестик. */
    icon?: ReactNode;
    /** Полиморфный тег заголовка. По умолчанию `span`. */
    as?: AccordionTitleTag;
}

export type AccordionContentProps = ComponentPropsWithRef<"div">;
