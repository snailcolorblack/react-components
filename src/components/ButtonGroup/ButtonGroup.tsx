// ButtonGroup.tsx

/* -------------------------------------------------------------------------- */
/*  ГРУППА КНОПОК С ОДНИМ ВЫБОРОМ                                             */
/*                                                                            */
/*  Сегментированный переключатель в двух видах: LINE — кнопки в строку       */
/*  с линией под активной, PILL — кнопки встык в коробке с таблеткой.         */
/*  Вид рисует общая оболочка (ButtonGroup.shell), её же берут вкладки.       */
/*                                                                            */
/*  Что делает браузер, а что мы:                                             */
/*                                                                            */
/*      Браузер — стрелки внутри группы, одна остановка табуляции на всю      */
/*      группу, взаимное исключение по общему name, участие в форме,          */
/*      :checked как состояние. Своего React-состояния здесь нет вовсе,       */
/*      пока группой не управляют снаружи.                                    */
/*                                                                            */
/*      CSS — индикатор. Он едет на anchor positioning: имя якоря есть        */
/*      только у выбранного варианта. Ни замеров, ни наблюдателей.            */
/*                                                                            */
/*      Мы — только имя группы по умолчанию и проброс выбора наружу.          */
/*                                                                            */
/*  Разметка трёхслойная, и средний слой не лишний: legend обязан быть        */
/*  первым ребёнком fieldset, поэтому коробка с фоном — вложенный блок.       */
/*  Иначе подпись оказалась бы внутри коробки, между её краем и кнопками.     */
/*                                                                            */
/*  Это не вкладки: кнопки ничего не открывают. Для вкладок есть Tabs —       */
/*  тот же вид, но роли и связи с панелями.                                   */
/* -------------------------------------------------------------------------- */

import {createContext, use, useId, useMemo, type ChangeEvent} from 'react';
import {ButtonGroupShell} from './ButtonGroup.shell.tsx';
import type {ButtonGroupItemProps, ButtonGroupProps} from './ButtonGroup.interface.ts';
import styles from './ButtonGroup.module.css';

interface GroupState {
    name: string
    value?: string
    defaultValue?: string
    onChange?: (value: string) => void
}

const GroupContext = createContext<GroupState | null>(null);

function ButtonGroup({
                         label,
                         showLabel = false,
                         variant = 'PILL',
                         name,
                         value,
                         defaultValue,
                         onChange,
                         className = '',
                         children,
                         ...props
                     }: ButtonGroupProps) {

    const auto = useId();
    const state = useMemo(
        /*
         * Имя обязательно, даже когда в форму ничего не уходит: без общего
         * name варианты не считаются одной группой — отмечались бы разом,
         * и стрелки между ними не ходили бы.
         */
        () => ({name: name ?? auto, value, defaultValue, onChange}),
        [name, auto, value, defaultValue, onChange],
    );

    return (
        <GroupContext value={state}>
            <fieldset {...props} className={[styles.field, className].filter(Boolean).join(' ')}>
                {/* Подпись стоит над коробкой отдельной строкой: fieldset
                    здесь без фона, фон у вложенной оболочки. */}
                <legend className={showLabel ? styles.legend : styles.hiddenLegend}>{label}</legend>

                <ButtonGroupShell variant={variant} pill={`--pill-${auto.replace(/[^\w-]/g, '-')}`}>
                    {children}
                </ButtonGroupShell>
            </fieldset>
        </GroupContext>
    );
}

function ButtonGroupItem({value, children, className = '', onChange, ...props}: ButtonGroupItemProps) {
    const outer = use(GroupContext);

    if (outer === null) throw new Error('ButtonGroup.Item должен лежать внутри <ButtonGroup>');

    const group = outer;
    const controlled = group.value !== undefined;

    return (
        <label className={[styles.item, className].filter(Boolean).join(' ')}>
            <input
                {...props}
                type="radio"
                name={group.name}
                value={value}
                checked={controlled ? group.value === value : undefined}
                defaultChecked={controlled ? undefined : group.defaultValue === value}
                className={styles.input}
                onChange={handleChange}
            />
            {children}
        </label>
    );

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        onChange?.(event);
        if (event.currentTarget.checked) group.onChange?.(value);
    }
}

ButtonGroup.Item = ButtonGroupItem;

export {ButtonGroup};
