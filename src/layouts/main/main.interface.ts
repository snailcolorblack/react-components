// main.interface.ts

import type {ComponentType} from 'react';

/**
 * Реестр страниц псевдо-сторибука.
 *
 * Ключ — значение вкладки: он же попадает в `id` панели и в подпись
 * кнопки, поэтому пишется так же, как называется компонент, только
 * со строчной первой буквы: `typography`, `buttonGroup`, `jsonViewer`.
 *
 * Значение — сама страница с примерами. Обычно это `lazy(...)`:
 * тогда код страницы уезжает в отдельный чанк и приходит при первом
 * открытии вкладки, а не на первой отрисовке приложения.
 */
export type Pages = Record<string, ComponentType>;

export interface MenuProps {
    pages: Pages
}

export interface ContentProps {
    pages: Pages
}
