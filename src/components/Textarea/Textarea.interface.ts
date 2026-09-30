// Textarea.interface.ts
import type {ComponentPropsWithRef} from 'react';
import type {FieldOwnProps} from '../Field/Field.interface.ts';

interface TextareaOwnProps extends FieldOwnProps {
    /** Показанное значение. Управляемый режим. */
    value?: string | number
    /** Начальное значение для неуправляемого режима. */
    defaultValue?: string | number
    /**
     * Значение изменилось. Приходит строка, а не событие, — как у Input
     * и Select.
     */
    onChange?: (value: string) => void
    /**
     * Расти вместе с текстом. По умолчанию да: поле начинается с `rows`
     * строк и вытягивается под содержимое.
     *
     * Это `field-sizing: content`, а не измерение высоты в JS: браузер
     * пересчитывает размер сам, без обработчиков ввода и без скачков
     * на первой отрисовке. Там, где свойство не поддержано, поле остаётся
     * фиксированным на `rows` строк и получает полосу прокрутки — то же
     * самое, что делает обычная textarea.
     *
     * Предел роста задаётся переменной `--textarea-max`, по умолчанию
     * это 12 строк: без потолка длинный текст выдавил бы за экран всё,
     * что лежит под полем.
     */
    autoGrow?: boolean
    /**
     * Подсказка внутри поля. Видна только у поля в фокусе: в покое её
     * место занимает подпись.
     */
    placeholder?: string
}

/**
 * Многострочное поле.
 *
 *     <Textarea label="Комментарий" name="comment"/>
 *     <Textarea label="Адрес" rows={2} maxLength={200}/>
 *     <Textarea label="Заметка" autoGrow={false} rows={6}/>
 *
 * Внутри настоящий `<textarea>`: перенос строк, `maxLength`, `required`,
 * проверка формы и объявление ошибки — платформенные. Коробка с плавающей
 * подписью общая с Input и Select.
 *
 * Приписок здесь нет намеренно: «₽» рядом с многострочным текстом
 * бессмысленно, а маска на текст с переносами не ложится.
 *
 * Остальные пропсы уходят на `<textarea>`: `rows`, `maxLength`, `required`,
 * `disabled`, `readOnly`, `ref`.
 */
export type TextareaProps =
    Omit<ComponentPropsWithRef<'textarea'>, 'onChange' | 'value' | 'defaultValue'>
    & TextareaOwnProps;
