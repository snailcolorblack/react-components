// Typography.tsx

/* -------------------------------------------------------------------------- */
/*  РАБОТА С ТЕКСТОМ                                                          */
/*                                                                            */
/*  Полиморфный компонент: as отвечает за тег в разметке, variant — за размер. */
/*  Разведены они потому, что в вёрстке постоянно расходятся: заголовок        */
/*  раздела бывает визуально мелким, а крупная цифра в карточке заголовком     */
/*  не является. Прибив размер к тегу, каждый раз приходится выбирать между    */
/*  правильной структурой документа и нужным видом.                            */
/* -------------------------------------------------------------------------- */

/* --- 1. Одного пропса обычно хватает -------------------------------------- */
/*
 *  <Typography as="h2">Настройки</Typography>       // тег h2, размер h2
 *  <Typography variant="h2">Настройки</Typography>  // то же самое
 *  <Typography>Обычный абзац</Typography>           // p, 16px
 *
 *  Второй проп выводится из первого. Тег и размер расходятся только там,
 *  где это действительно нужно:
 *
 *  <Typography as="h1" variant="h3">Настройки</Typography>
 *      — первый заголовок страницы, набранный мелко.
 *  <Typography as="p" variant="h2">128</Typography>
 *      — крупное число, которое не должно попасть в оглавление.
 */

/* --- 2. Размеры вне шкалы ------------------------------------------------- */
/*
 *  caption  12px — подпись к иллюстрации, сноска, служебная пометка
 *  note     14px — вторичный текст, помощь под полем ввода
 *  lead     20px — вводный абзац, чуть крупнее основного
 *  subtitle 22px — подзаголовок под крупным заголовком
 *
 *  <Typography variant="note">Файл больше 10 МБ загрузить нельзя</Typography>
 *  <Typography as="figcaption">Рис. 2</Typography>   // caption сам по себе
 *
 *  Тег small и figcaption получают 14px и 12px без указания variant:
 *  это их обычный размер, и писать его каждый раз незачем.
 */

/* --- 3. Чего variant не делает -------------------------------------------- */
/*
 *  variant меняет размер и межстрочный интервал. Насыщенность и начертание
 *  остаются за тегом: <strong> жирный, <em> наклонный, h1…h6 жирные сами
 *  по себе — браузером, а не нашими стилями.
 *
 *  Поэтому <Typography as="div" variant="h1"> даст 40px обычным начертанием,
 *  а не «что-то похожее на заголовок». Нужен вид заголовка — берите заголовок;
 *  если он не должен попасть в оглавление, есть role="presentation".
 */

/* --- 4. Порядок заголовков ------------------------------------------------ */
/*
 *  Компонент не следит за тем, чтобы h1…h6 шли без пропусков: он видит
 *  только себя. Это остаётся на разметке страницы — скринридер строит
 *  по заголовкам оглавление, и прыжок с h2 на h4 в нём выглядит как
 *  потерянный раздел.
 *
 *  Заголовок на странице ровно один — h1. Всё остальное вложено в него
 *  по уровням.
 */

/* --- 5. Перерисовки -------------------------------------------------------- */
/*
 *  Состояния нет, хуков нет, эффектов нет: компонент считает две строки
 *  и отдаёт один элемент. Перерисовывается он только вместе с родителем,
 *  и memo здесь дороже самой работы.
 */
/* -------------------------------------------------------------------------- */

import type {ElementType} from 'react';
import type {
    TypographyProps,
    TypographyTag,
    TypographyVariant,
} from './Typography.interface.ts';
import styles from './Typography.module.css';

const VARIANT_CLASS = {
    h1: styles.h1,
    h2: styles.h2,
    h3: styles.h3,
    h4: styles.h4,
    h5: styles.h5,
    h6: styles.h6,
    p: styles.p,
    caption: styles.caption,
    note: styles.note,
    lead: styles.lead,
    subtitle: styles.subtitle,
    inheritable: styles.inheritable,
} satisfies Record<TypographyVariant, string>;

/*
 * Размер по умолчанию для каждого тега. Таблица перечислена целиком, а не
 * выведена правилом «совпадает с именем тега»: у small и figcaption свой
 * обычный размер, и правило пришлось бы тут же нарушить.
 */
const TAG_VARIANT = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    p: 'p',
    span: 'p',
    div: 'p',
    li: 'p',
    strong: 'p',
    em: 'p',
    label: 'p',
    legend: 'p',
    blockquote: 'p',
    small: 'note',
    figcaption: 'caption',
} satisfies Record<TypographyTag, TypographyVariant>;

/*
 * Тег по умолчанию для каждого размера. Заголовочные варианты дают
 * одноимённый тег, остальные — абзац: caption и note это размер, а не
 * структура, и решать за разметку, что подпись к рисунку является
 * figcaption, компонент не должен.
 */
const VARIANT_TAG = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    p: 'p',
    caption: 'p',
    note: 'p',
    lead: 'p',
    subtitle: 'p',
    inheritable: 'span',
} satisfies Record<TypographyVariant, TypographyTag>;

function Typography<T extends TypographyTag = 'p'>({
                                                       as,
                                                       variant,
                                                       className = '',
                                                       ...props
                                                   }: TypographyProps<T>) {

    const tag = as ?? (variant ? VARIANT_TAG[variant] : 'p');
    const size = variant ?? TAG_VARIANT[tag];
    const classes = [styles.text, VARIANT_CLASS[size], className].filter(Boolean).join(' ');

    const Component = tag as ElementType;

    return <Component {...props} className={classes}/>;
}

export {Typography};
