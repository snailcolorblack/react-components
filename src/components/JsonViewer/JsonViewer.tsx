// JsonViewer.tsx

/* -------------------------------------------------------------------------- */
/*  ПРОСМОТР JSON                                                             */
/*                                                                            */
/*  Дерево со сворачиванием. Сворачивают нативные <details> и <summary>:      */
/*  от платформы приходят клавиатура (Enter и пробел) и роль с состоянием     */
/*  «развёрнут» в дереве доступности.                                         */
/*                                                                            */
/*  Своего состояния у узла ровно одно: открыт он или нет, и нужно оно        */
/*  не для вида (вид делает CSS по details[open]), а чтобы не рисовать        */
/*  содержимое закрытых веток.                                                */
/*                                                                            */
/*  За это приходится платить поиском по странице, и цена замерена с обеих    */
/*  сторон. Закрытая ветка без содержимого в разметке поиском не находится    */
/*  вовсе; с содержимым — находится (window.find в закрытом <details> даёт    */
/*  true, CDP-поиск видит узел). А дерево из 60 счетов разворачивается        */
/*  целиком за 62мс, превращаясь из 25 элементов разметки в 4644. То есть     */
/*  на сотнях узлов можно позволить себе и то, и другое — поэтому выбор       */
/*  отдан пропом lazy, а не решён за всех.                                    */
/* -------------------------------------------------------------------------- */

/* --- Почему узел — компонент, а не функция -------------------------------- */
/*
 *  Соблазн написать helper вроде renderObject(value, key) и звать его
 *  рекурсивно велик, но внутри такому helper'у нужен useState. А хуки
 *  считаются по порядку вызова: число вызовов начинает зависеть от формы
 *  данных, и первое же изменение JSON сдвигает порядок — React отдаёт
 *  одному узлу состояние другого. Поэтому узел здесь настоящий
 *  компонент: сколько узлов, столько и наборов хуков, каждый свой.
 */

/* --- Запятые ------------------------------------------------------------- */
/*
 *  Запятая рисуется разметкой, а не ::after в CSS. Так она попадает
 *  в выделение и в копию: из просмотра можно выделить кусок и вставить
 *  его как JSON. Через content её не скопировать вовсе.
 *
 *  Ставится она после закрывающей скобки узла, а не после его summary, —
 *  то есть там же, где стояла бы в тексте.
 */
/* -------------------------------------------------------------------------- */

import {useId, useState} from 'react';
import type {JsonValue, JsonViewerLabels, JsonViewerProps} from './JsonViewer.interface.ts';
import styles from './JsonViewer.module.css';

const LABELS: JsonViewerLabels = {
    expand: 'Раскрыть всё',
    collapse: 'Свернуть всё',
    copy: 'Копировать',
    copied: 'Скопировано',
};

/** Сколько элементов внутри: «1 поле», «3 поля», «12 полей», «40 шт.». */
function amount(length: number, kind: 'object' | 'array') {
    if (kind === 'array') return `${length} шт.`;

    const десятки = length % 100;
    const единицы = length % 10;
    /* Второй десяток — исключение целиком: 11…14 всегда «полей». */
    const слово = десятки >= 11 && десятки <= 14 ? 'полей'
        : единицы === 1 ? 'поле'
            : единицы >= 2 && единицы <= 4 ? 'поля'
                : 'полей';

    return `${length} ${слово}`;
}

function JsonViewer({
                        value,
                        defaultDepth = 1,
                        toolbar = true,
                        lazy = true,
                        labels,
                        count = amount,
                        className = '',
                        ...props
                    }: JsonViewerProps) {

    /*
     * Номер поколения. «Раскрыть всё» и «свернуть всё» меняют его,
     * и дерево пересобирается с новой глубиной по умолчанию: открытость
     * у <details> своя, снаружи её иначе не перебить — разве что держать
     * состояние каждого узла наверху, а это ровно то, от чего дерево
     * и должно избавлять.
     */
    const [depth, setDepth] = useState(defaultDepth);
    const [generation, setGeneration] = useState(0);
    const [copied, setCopied] = useState(false);
    const id = useId();

    const words = {...LABELS, ...labels};

    return (
        <div {...props} className={[styles.viewer, className].filter(Boolean).join(' ')}>
            {toolbar && (
                <div className={styles.toolbar}>
                    <button type="button" className={styles.action} onClick={() => reset(Infinity)}>
                        {words.expand}
                    </button>
                    <button type="button" className={styles.action} onClick={() => reset(0)}>
                        {words.collapse}
                    </button>
                    <button type="button" className={styles.action} onClick={copy}>
                        {copied ? words.copied : words.copy}
                    </button>
                </div>
            )}

            {/*
              * <pre> не ради моноширинного шрифта: это блок, где перенос
              * строк значим, и скопированный кусок сохраняет раскладку.
              */}
            <pre className={styles.tree} id={id}>
                <Node
                    key={generation}
                    value={value}
                    depth={0}
                    open={0 < depth}
                    openTo={depth}
                    last
                    lazy={lazy}
                    count={count}
                />
            </pre>
        </div>
    );

    function reset(to: number) {
        setDepth(to);
        setGeneration(was => was + 1);
    }

    async function copy() {
        try {
            await navigator.clipboard.writeText(JSON.stringify(value, null, 4));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* Буфер может быть запрещён настройками или недоступен вне
               защищённого соединения. Сказать об этом нечего — кнопка
               просто не сработала. */
        }
    }
}

interface NodeProps {
    /** Ключ, под которым узел лежит у родителя. У корня его нет. */
    name?: string;
    value: JsonValue;
    /** Глубина: по ней решается, раскрыт ли узел сразу. */
    depth: number;
    open: boolean;
    openTo: number;
    /** Последний ли в своём родителе: от этого зависит запятая. */
    last: boolean;
    /** Не рисовать содержимое закрытых веток. */
    lazy: boolean;
    count: (length: number, kind: 'object' | 'array') => React.ReactNode;
}

/** Один узел дерева. Настоящий компонент — см. шапку файла. */
function Node({name, value, depth, open, openTo, last, lazy, count}: NodeProps) {
    const [shown, setShown] = useState(open);

    const kind = Array.isArray(value) ? 'array' : 'object';
    const entries = value !== null && typeof value === 'object'
        ? Object.entries(value as Record<string, JsonValue>)
        : undefined;

    /* Простое значение: строка, число, true/false, null. */
    if (entries === undefined) {
        return (
            <div className={styles.row}>
                {name !== undefined && <span className={styles.name}>"{name}"</span>}
                {name !== undefined && <span className={styles.colon}>: </span>}
                <span className={styles.value} data-type={value === null ? 'null' : typeof value}>
                    {typeof value === 'string' ? `"${value}"` : String(value)}
                </span>
                {!last && <span className={styles.comma}>,</span>}
            </div>
        );
    }

    const [left, right] = kind === 'array' ? ['[', ']'] : ['{', '}'];

    /*
     * Пустые {} и [] не сворачиваются: раскрывать в них нечего, а треугольник
     * обещал бы содержимое. Строкой — как в тексте.
     */
    if (entries.length === 0) {
        return (
            <div className={styles.row}>
                {name !== undefined && <span className={styles.name}>"{name}"</span>}
                {name !== undefined && <span className={styles.colon}>: </span>}
                <span className={styles.brace}>{left}{right}</span>
                {!last && <span className={styles.comma}>,</span>}
            </div>
        );
    }

    return (
        <details
            className={styles.node}
            open={shown}
            onToggle={event => setShown(event.currentTarget.open)}
        >
            <summary className={styles.row}>
                {name !== undefined && <span className={styles.name}>"{name}"</span>}
                {name !== undefined && <span className={styles.colon}>: </span>}
                <span className={styles.brace}>{left}</span>
                {/*
                  * Свёрнутый вид целиком здесь, а показывает его CSS
                  * по details[open]: состояния для этого не нужно,
                  * а значит, нет и перерисовки на каждое раскрытие.
                  */}
                <span className={styles.peek}>
                    <span className={styles.count}>{count(entries.length, kind)}</span>
                    <span className={styles.brace}>{right}</span>
                    {!last && <span className={styles.comma}>,</span>}
                </span>
            </summary>

            {/*
              * Содержимое закрытой ветки по умолчанию не рисуется вовсе:
              * у <details> оно осталось бы в разметке, просто скрытым,
              * и дерево платило бы за каждый свёрнутый узел. Ценой
              * поиска по странице — см. шапку файла и проп lazy.
              */}
            {(shown || !lazy) && (
                <div className={styles.children}>
                    {entries.map(([key, item], index) => (
                        <Node
                            key={key}
                            name={kind === 'array' ? undefined : key}
                            value={item}
                            depth={depth + 1}
                            open={depth + 1 < openTo}
                            openTo={openTo}
                            last={index === entries.length - 1}
                            lazy={lazy}
                            count={count}
                        />
                    ))}
                </div>
            )}

            <div className={styles.row}>
                <span className={styles.brace}>{right}</span>
                {!last && <span className={styles.comma}>,</span>}
            </div>
        </details>
    );
}

export {JsonViewer};
