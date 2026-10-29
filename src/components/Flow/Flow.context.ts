// Flow.context.ts
import {createContext, use} from 'react';
import type {FlowState} from './Flow.interface.ts';

export const FlowContext = createContext<FlowState | undefined>(undefined);

/**
 * Состояние процесса. Работает только внутри `<Flow>`.
 *
 *     const {data, setData, goNextStep} = useFlow<SurveyData>();
 *
 * Тип данных задаётся на месте вызова: контекст один на все процессы,
 * а данные у каждого свои.
 */
export function useFlow<T = object>() {
    /*
     * use(), а не useContext(): в React 19 это тот же вызов, но его
     * можно делать внутри условия — шагу иногда нужно спросить процесс
     * только в одной ветке.
     */
    const flow = use(FlowContext) as FlowState<T> | undefined;

    if (flow === undefined) {
        throw new Error('useFlow: вызывается только внутри <Flow>.');
    }

    return flow;
}
