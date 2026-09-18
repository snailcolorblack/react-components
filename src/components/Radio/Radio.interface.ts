// Radio.interface.ts
import type {ComponentPropsWithRef} from 'react';
import type {ControlOwnProps} from '../Control/Control.interface.ts';

interface RadioOwnProps extends ControlOwnProps {
    /**
     * Имя группы. Обязательно — в отличие от флажка, переключатель
     * поодиночке не существует: именно общее `name` связывает варианты
     * в одну группу, гасит соседей при выборе и делает всю группу
     * одним таб-стопом со стрелками внутри. Без него получится набор
     * независимых кружков, которые все можно включить разом.
     */
    name: string
    /**
     * Значение, которое уйдёт в форму. Тоже обязательно: без него
     * выбранный переключатель отправит бесполезное "on", и по данным
     * будет не понять, что именно выбрали.
     */
    value: string | number
}

/**
 * Переключатель — вариант внутри группы, а не самостоятельное поле.
 *
 * `className` и `style` попадают на обёртку `<label>`, где живут оформление
 * и переменные цвета. Всё остальное идёт на сам `<input>`: `checked`,
 * `defaultChecked`, `onChange`, `disabled`, `required`, `form`. Туда же `ref`.
 *
 *     <Radio name="plan" value="pro" defaultChecked>Профессиональный</Radio>
 *     <Radio name="plan" value="free">Бесплатный</Radio>
 *
 * Сам по себе компонент недоступен: группе нужно общее имя — `fieldset`
 * с `legend` или `role="radiogroup"` с `aria-label`, — иначе скринридер
 * прочитает варианты, но не скажет, к чему они относятся. Это задача
 * RadioGroup; пока её нет, имя группе даёт разметка вокруг.
 *
 * Снять выбор кликом нельзя — так работает платформа. Нужен вариант
 * «ничего из перечисленного» — добавьте его отдельным переключателем.
 */
export type RadioProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children' | 'name' | 'value'> & RadioOwnProps;
