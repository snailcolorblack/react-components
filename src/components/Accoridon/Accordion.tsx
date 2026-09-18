// Accordion.tsx

/* -------------------------------------------------------------------------- */
/*  РАБОТА С АККОРДЕОНОМ                                                      */
/*                                                                            */
/*  Под компонентом нативные <details> и <summary>. Раскрытие, Enter и Space,  */
/*  роль с состоянием «развёрнут», поиск по странице внутри свёрнутого блока   */
/*  — всё это браузер делает сам, состояние здесь не нужно.                    */
/*                                                                            */
/*  Анатомия: Accordion > Accordion.Header + Accordion.Content.                */
/*  Именованные экспорты подкомпонентов тоже есть — точечная запись это сахар. */
/* -------------------------------------------------------------------------- */

/* --- 1. Одиночный блок ---------------------------------------------------- */
/*
 *  <Accordion>
 *      <Accordion.Header>Заголовок</Accordion.Header>
 *      <Accordion.Content>Содержимое</Accordion.Content>
 *  </Accordion>
 *
 *  Раскрытым при загрузке — проп open, как у нативного <details>:
 *      <Accordion open>…</Accordion>
 *
 *  Это неуправляемый режим: дальше открытием распоряжается пользователь,
 *  React в него не вмешивается. Если нужно знать состояние — слушайте
 *  событие toggle: <Accordion onToggle={event => …}>.
 */

/* --- 2. Группа: открыт только один ---------------------------------------- */
/*
 *  <Accordion name="faq">…</Accordion>
 *  <Accordion name="faq">…</Accordion>
 *
 *  Общий name делает блоки взаимоисключающими — это нативный атрибут
 *  <details>, никакого JS. Замерено: при раскрытии второго первый
 *  закрывается сам, а блок без name к группе не относится и остаётся
 *  как был.
 *
 *  Имя группы должно быть уникальным на странице, иначе два несвязанных
 *  списка начнут закрывать друг друга.
 */

/* --- 3. Заголовок как настоящий заголовок --------------------------------- */
/*
 *  <Accordion.Header as="h3">Раздел</Accordion.Header>
 *
 *  По умолчанию подпись оборачивается в <span>: аккордеон не обязан быть
 *  заголовком, и лишний h-уровень ломает оглавление страницы. Но если блоки
 *  действительно разделы документа, as даёт им место в структуре —
 *  скринридер сможет перемещаться по ним как по заголовкам.
 *
 *  Уровень выбирайте по месту в документе, а не по внешнему виду: h3 под
 *  h2, а не потому, что h3 меньше.
 */

/* --- Иконка --------------------------------------------------------------- */
/*
 *  <Accordion.Header icon={<MyIcon/>}>…</Accordion.Header>
 *
 *  Своя вместо плюса. Иконка помечена aria-hidden и поворачивается на 45°
 *  при раскрытии — поворот считается от исходного положения, так что крестик
 *  из плюса получается сам. Если иконка не симметричная, поворот переопределите
 *  через .icon в своём className.
 *
 *  Состояние иконкой не передаётся: его уже несёт сам <summary>, и дублировать
 *  это текстом («Развернуть/Свернуть») не нужно — скринридер прочитает дважды.
 */
/* -------------------------------------------------------------------------- */


import {plusIcon} from "../../assets/icons/icon.tsx";
import type {AccordionProps, AccordionHeaderProps, AccordionContentProps} from "./Accordion.interface.ts";
import styles from "./Accordion.module.css";
import {Typography} from "../Typography/Typography.tsx";


function Accordion({
                       className = '',
                       children,
                       ...props
                   }: AccordionProps) {

    return (
        <details className={`${styles.accordion} ${className}`.trim()} {...props}>
            {children}
        </details>
    )
}

function AccordionHeader({
                             icon,
                             as: Title = 'span',
                             className = '',
                             children,
                             ...props
                         }: AccordionHeaderProps) {

    return (
        <summary className={`${styles.accordion_header} ${className}`.trim()} {...props}>
            <Typography as={Title} className={styles.accordion_header__title}>{children}</Typography>
            <div className={styles.icon} aria-hidden="true">
                {icon ?? plusIcon}
            </div>
        </summary>
    );
}

function AccordionContent({
                              className = '',
                              children,
                              ...props
                          }: AccordionContentProps) {

    return (
        <div className={`${styles.accordion_content} ${className}`.trim()} {...props}>
            {children}
        </div>
    );
}

Accordion.Header = AccordionHeader;
Accordion.Content = AccordionContent;
export {Accordion};
