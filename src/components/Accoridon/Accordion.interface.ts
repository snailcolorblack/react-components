// Accordion.interface.ts
import type {ComponentPropsWithRef, ReactNode} from "react";

/**
 * Раскрывающийся блок на нативных `<details>` и `<summary>`.
 *
 *     <Accordion>
 *         <Accordion.Header as="h3">Доставка</Accordion.Header>
 *         <Accordion.Content>Три дня по городу.</Accordion.Content>
 *     </Accordion>
 *
 * Открытие, клавиатура, поиск по странице и печать — всё платформенное,
 * своего состояния у компонента нет. Общий атрибут `name` у нескольких
 * блоков делает их взаимоисключающими: браузер закроет соседа сам.
 */
export type AccordionProps = ComponentPropsWithRef<"details">;

export type AccordionTitleTag =
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'p' | 'span'
    | 'div';


export interface AccordionHeaderProps extends ComponentPropsWithRef<"summary"> {
    /** Значок справа. По умолчанию плюс. Декоративный, в озвучку не идёт. */
    icon?: ReactNode;
    /**
     * Тег заголовка внутри `summary`. По умолчанию `span` — то есть
     * заголовка нет.
     *
     * Для страницы из нескольких раскрывающихся блоков это стоит менять
     * на `h2`–`h4`. Замерено: без этого ни один `summary` не попадает
     * в список заголовков, и человек со скринридером не может пройтись
     * по разделам клавишей заголовков — только табом через всё подряд.
     *
     * Уровень выбирается по месту на странице, а не по виду: размер
     * шрифта задаётся стилями, а `as` отвечает за структуру.
     */
    as?: AccordionTitleTag;
}

export type AccordionContentProps = ComponentPropsWithRef<"div">;
