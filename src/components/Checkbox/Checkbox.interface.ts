// Checkbox.interface.ts
import type {ComponentPropsWithRef} from 'react';
import type {ControlOwnProps} from '../Control/Control.interface.ts';

interface CheckboxOwnProps extends ControlOwnProps {
    /**
     * Промежуточное состояние: «часть вложенных отмечена». Флажок рисует
     * чёрточку вместо галочки, а скринридер читает «частично отмечено».
     *
     * Ставится только свойством DOM — атрибута с таким именем в HTML нет,
     * поэтому компонент держит ref и проставляет его эффектом. По той же
     * причине состояние не переживает отправку формы: в данные уходит
     * неотмеченный флажок.
     *
     * Снимается само: клик по флажку с промежуточным состоянием делает
     * его отмеченным, и вернуть промежуточное можно только пропсом.
     */
    indeterminate?: boolean
}

/**
 * Флажок — самостоятельный выключатель: сам себе группа, сам себе таб-стоп.
 *
 * `className` и `style` попадают на обёртку `<label>`, потому что оформление
 * и переменные цвета живут на ней. Все остальные пропсы идут на сам `<input>`:
 * `name`, `value`, `checked`, `defaultChecked`, `onChange`, `disabled`,
 * `required`, `form`. Туда же и `ref` — он указывает на поле, а не на обёртку,
 * чтобы работали `focus()` и `checked`.
 *
 *     <Checkbox name="terms" value="yes" defaultChecked>
 *         Согласен с условиями
 *     </Checkbox>
 *
 * Неотмеченный флажок в данные формы не попадает вовсе — это поведение
 * платформы, а не компонента. Если серверу нужен явный «нет», кладите
 * рядом скрытое поле.
 */
export type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> & CheckboxOwnProps;
