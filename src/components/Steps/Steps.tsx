// Steps.tsx

/* -------------------------------------------------------------------------- */
/*  ШКАЛА ШАГОВ                                                               */
/*                                                                            */
/*  Где человек сейчас, что позади и сколько осталось. <ol> со списком:       */
/*  порядок делений значим, и скринридер объявит, сколько их всего.           */
/*  Текущее деление помечено aria-current="step" — другого aria-состояния     */
/*  для «вы здесь» не существует.                                             */
/* -------------------------------------------------------------------------- */

/* --- Кружок — рисунок, состояние — слово ---------------------------------- */
/*
 *  Номер в кружке, галочка у пройденного и крест у шага с ошибкой
 *  спрятаны от скринридера: он и так читает список по порядку,
 *  а «1» перед подписью только мешала бы. Состояние приходит текстом,
 *  невидимым глазами: «пройден», «текущий шаг», «ошибка».
 *
 *  Цвет при этом ничего не несёт в одиночку: у пройденного своя фигура
 *  (галочка), у ошибки своя (крест). В режиме высокого
 *  контраста система выбрасывает палитру, и разница по цвету пропала бы
 *  совсем (WCAG 1.4.1).
 */

/* --- Нажимаемость --------------------------------------------------------- */
/*
 *  По умолчанию шкала — показатель, а не навигация: ни кнопок,
 *  ни табуляции. Нажимаемой её делает проп, и нажимаются только
 *  пройденные деления и текущее: вперёд по шкале не ходят, туда
 *  ведёт кнопка «Дальше», у которой есть проверка.
 */

/* --- Внутри Flow ---------------------------------------------------------- */
/*
 *  Процесс уже знает и шаги, и текущий, и пройденный путь, поэтому
 *  внутри него шкала работает без пропсов. Читается он через контекст
 *  напрямую, а не через useFlow(): тот нарочно бросает снаружи процесса,
 *  а шкале снаружи жить можно.
 */
/* -------------------------------------------------------------------------- */

import {use, type ReactNode} from 'react';
import {crossIcon, successIcon} from '../../assets/icons/icon.tsx';
import {FlowContext} from '../Flow/Flow.context.ts';
import type {Step, StepState, StepsLabels, StepsProps} from './Steps.interface.ts';
import styles from './Steps.module.css';

const LABELS: StepsLabels = {
    step: (index, total) => `Шаг ${index + 1} из ${total}`,
    done: 'пройден',
    current: 'текущий шаг',
    error: 'ошибка',
};

function Steps({
                   items,
                   current,
                   done,
                   orientation = 'HORIZONTAL',
                   ident = true,
                   doneIcon = successIcon,
                   clickable,
                   onStepClick,
                   label = 'Шаги',
                   labels,
                   className = '',
                   ...props
               }: StepsProps) {

    /* Процесс рядом или нет — шкала работает и так, и так. */
    const flow = use(FlowContext);

    const words = {...LABELS, ...labels};
    const steps: Step[] = items ?? flow?.steps.map(step => ({
        name: step.name,
        label: step.title ?? step.name,
        description: step.description,
    })) ?? [];
    const here = current ?? flow?.currentStepIndex ?? 0;
    /*
     * Пройденные: либо сказали прямо, либо их помнит процесс, либо
     * считаем прямым путём — всё, что левее текущего.
     *
     * Путь процесса берётся только для его же шагов: при своём списке
     * имена не совпадают, и память процесса к нему не относится.
     * Замерено тестом — иначе собственные items внутри Flow теряли
     * все пройденные деления разом.
     */
    const passed = done ?? (flow !== undefined && items === undefined
        ? steps.map((step, index) => (step.name !== undefined && flow.reached.includes(step.name) && index !== here ? index : -1))
            .filter(index => index >= 0)
        : undefined);
    const hit = clickable ?? onStepClick !== undefined;
    const total = steps.length;

    if (total === 0) return null;

    return (
        <ol
            {...props}
            aria-label={label}
            data-orientation={orientation}
            data-ident={ident === false ? 'bar' : 'mark'}
            className={[styles.steps, className].filter(Boolean).join(' ')}
        >
            {steps.map((step, index) => {
                const state = status(step, index);
                const live = hit && step.disabled !== true && (state === 'done' || state === 'error' || index === here);
                const inside = (
                    <>
                        {ident !== false && (
                            <span className={styles.mark} aria-hidden="true">{face(step, state, index)}</span>
                        )}
                        <span className={styles.text}>
                            <span className={styles.label}>{step.label}</span>
                            {/* Ошибка вытесняет пояснение: она важнее. */}
                            {note(step) !== undefined && <span className={styles.note}>{note(step)}</span>}
                        </span>
                        {/* Состояние — словом: цвет и фигура его не заменяют. */}
                        <span className={styles.sr}>
                            {`${words.step(index, total)}${sound(state) === '' ? '' : `, ${sound(state)}`}`}
                        </span>
                    </>
                );

                return (
                    <li
                        key={step.name ?? index}
                        className={styles.item}
                        data-state={state}
                    >
                        {live
                            ? (
                                <button
                                    type="button"
                                    className={styles.hit}
                                    aria-current={index === here ? 'step' : undefined}
                                    onClick={() => pick(index, step)}
                                >
                                    {inside}
                                </button>
                            )
                            : (
                                <span
                                    className={styles.hit}
                                    aria-current={index === here ? 'step' : undefined}
                                    aria-disabled={hit && step.disabled === true ? true : undefined}
                                >
                                    {inside}
                                </span>
                            )}
                    </li>
                );
            })}
        </ol>
    );

    function status(step: Step, index: number): StepState {
        if (step.error !== undefined && step.error !== false) return 'error';
        if (index === here) return 'current';
        if (passed !== undefined) return passed.includes(index) ? 'done' : 'next';

        return index < here ? 'done' : 'next';
    }

    /** Что в кружке: свой значок, галочка пройденного, общий значок, номер. */
    function face(step: Step, state: StepState, index: number): ReactNode {
        if (step.icon !== undefined) return step.icon;
        if (state === 'error') return crossIcon;
        if (state === 'done' && doneIcon !== false) return doneIcon;
        if (ident !== true) return ident;

        return index + 1;
    }

    function note(step: Step): ReactNode {
        if (typeof step.error === 'boolean' || step.error === undefined) return step.description;

        return step.error;
    }

    function sound(state: StepState) {
        if (state === 'done') return words.done;
        if (state === 'current') return words.current;
        if (state === 'error') return words.error;

        return '';
    }

    function pick(index: number, step: Step) {
        if (onStepClick !== undefined) {
            onStepClick(index, step);

            return;
        }

        /* Внутри процесса шкала ходит сама: goToStep пускает только
           назад и на текущий, то есть ровно туда, куда можно. */
        if (flow !== undefined && step.name !== undefined) flow.goToStep(step.name);
    }
}

export {Steps};
