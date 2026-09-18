// Typography.interface.ts
import type {ComponentPropsWithRef} from 'react';

/**
 * Теги, которыми разрешено отрисоваться. Список закрыт нарочно: сюда
 * входит только то, что несёт текст. `as="button"` или `as="input"` —
 * это уже не типографика, а другой компонент со своим поведением.
 */
export type TypographyTag =
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'p' | 'span' | 'div' | 'li'
    | 'small' | 'strong' | 'em'
    | 'label' | 'legend' | 'figcaption' | 'blockquote';

/** Варианты, повторяющие шкалу заголовков и основного текста. */
export type TypographyTagVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

/**
 * Размеры вне основной шкалы.
 *
 * `caption` — 12px: подпись к иллюстрации, сноска, служебная пометка.
 * `note` — 14px: вторичный текст, помощь под полем, мелкий интерфейс.
 * `lead` — 20px: вводный абзац, чуть крупнее основного текста.
 * `subtitle` — 22px: подзаголовок под крупным заголовком.
 * `inheritable` — n-px: наследуется от родителя.
 */
export type TypographyExtraVariant = 'caption' | 'note' | 'lead' | 'subtitle' | 'inheritable';

export type TypographyVariant = TypographyTagVariant | TypographyExtraVariant;

interface TypographyOwnProps<T extends TypographyTag> {
    /**
     * Тег в разметке — семантика и только она. От него зависит структура
     * документа: заголовки попадают в оглавление скринридера, `small`
     * и `strong` несут собственный смысл, `p` — обычный абзац.
     *
     * По умолчанию выводится из `variant`: у h1…h6 и p тег совпадает
     * с вариантом, у остальных — `p`.
     */
    as?: T
    /**
     * Размер — и только размер. Насыщенность и начертание остаются за тегом:
     * `as="strong"` жирный, `as="em"` наклонный, заголовки жирные сами по себе.
     * Поэтому `variant="h1"` на `<div>` даст 40px обычным начертанием, а не
     * «похоже на заголовок». Нужен вид заголовка — берите заголовок.
     *
     * По умолчанию выводится из `as`: h1…h6 и p дают одноимённый размер,
     * `small` — 14px, `figcaption` — 12px, остальные теги — размер абзаца.
     */
    variant?: TypographyVariant
}

/**
 * Полиморфный текстовый компонент: `as` отвечает за смысл, `variant` — за размер.
 *
 * Разведены они потому, что в вёрстке эти вещи постоянно расходятся:
 * первый заголовок страницы бывает визуально мелким, а крупная цифра
 * в карточке заголовком не является. Прибивать размер к тегу — значит
 * каждый раз выбирать между правильной структурой документа и нужным видом.
 *
 *     <Typography as="h1" variant="h3">Настройки</Typography>
 *     <Typography variant="caption">Обновлено вчера</Typography>
 *     <Typography as="span" variant="note">12 из 40</Typography>
 *
 * Пропсы наследуются от выбранного тега: `htmlFor` появится только
 * у `as="label"`, `cite` — только у `as="blockquote"`.
 */
export type TypographyProps<T extends TypographyTag = 'p'> =
    Omit<ComponentPropsWithRef<T>, 'as' | 'variant'>
    & TypographyOwnProps<T>;
