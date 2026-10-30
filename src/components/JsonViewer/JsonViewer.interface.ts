// JsonViewer.interface.ts
import type {ComponentPropsWithRef, ReactNode} from 'react';

/**
 * Значение JSON. `null` здесь не для полноты: он в JSON есть, и без него
 * `typeof null === 'object'` уводит разбор в ветку объекта, где у null
 * нет ни ключей, ни длины.
 */
export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | {[key: string]: JsonValue};

interface JsonViewerOwnProps {
    /** Что показывать. */
    value: JsonValue;
    /**
     * До какого уровня раскрыто при первой отрисовке. По умолчанию 1 —
     * видно корень и его прямых детей, остальное свёрнуто.
     *
     * `Infinity` раскрывает всё сразу.
     */
    defaultDepth?: number;
    /**
     * Кнопки «раскрыть всё», «свернуть всё» и «копировать». По умолчанию
     * есть. Нужна только разметка — передайте `false` и сделайте свои:
     * всё это обычные действия над деревом.
     */
    toolbar?: boolean;
    /**
     * Не рисовать содержимое закрытых веток. По умолчанию `true`.
     *
     * Замерено: дерево из шестидесяти счетов в закрытом виде — 25
     * элементов разметки, в раскрытом — 4644, и разворачивается оно
     * целиком за 62мс. То есть на сотнях узлов дорого не выходит ни так,
     * ни так, и выбирать стоит по другому: закрытая ветка, которой нет
     * в разметке, не находится поиском по странице. Нужен поиск —
     * `lazy={false}`; замерено, что текст в закрытом `<details>` поиск
     * находит, когда он в разметке есть.
     */
    lazy?: boolean;
    /**
     * Подписи кнопок — чтобы не вшивать русский в компонент намертво.
     */
    labels?: Partial<JsonViewerLabels>;
    /**
     * Сколько элементов показывать в свёрнутом узле: «{ 12 полей }».
     * Своя: `count={(length, kind) => …}`. Вернули `null` — счётчика нет.
     */
    count?: (length: number, kind: 'object' | 'array') => ReactNode;
}

export interface JsonViewerLabels {
    expand: string;
    collapse: string;
    copy: string;
    copied: string;
}

/**
 * Просмотр JSON: дерево со сворачиванием, подсветкой типов и запятыми
 * на своих местах.
 *
 *     <JsonViewer value={response}/>
 *     <JsonViewer value={response} defaultDepth={Infinity} toolbar={false}/>
 *
 * Сворачивание — нативные `<details>` и `<summary>`: клавиатура, роль
 * с состоянием «развёрнут» и поиск по странице внутри свёрнутых веток
 * приходят от платформы, состояния в React для этого не нужно.
 *
 * Переменные на коробке:
 *
 * | Переменная            | Что меняет                 |
 * |-----------------------|----------------------------|
 * | `--json-bg`           | фон                        |
 * | `--json-fg`           | цвет ключей и скобок       |
 * | `--json-string`       | цвет строк                 |
 * | `--json-number`       | цвет чисел                 |
 * | `--json-boolean`      | цвет true/false            |
 * | `--json-null`         | цвет null                  |
 * | `--json-indent`       | отступ уровня              |
 */
export type JsonViewerProps =
    Omit<ComponentPropsWithRef<'div'>, 'defaultValue'>
    & JsonViewerOwnProps;
