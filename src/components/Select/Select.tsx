// Select.tsx

/* -------------------------------------------------------------------------- */
/*  ВЫБОР ИЗ СПИСКА                                                           */
/*                                                                            */
/*  Один виджет на оба варианта: кнопка role="combobox" и список              */
/*  role="listbox". single и multi отличаются двумя вещами — заменяет выбор   */
/*  прежний или переключает, и закрывается ли список после выбора. Скрытые    */
/*  поля для формы у них общие: по одному на каждое выбранное значение,       */
/*  просто у single выбранное всегда одно. Всё остальное тоже общее.          */
/*                                                                            */
/*  Нативного <select> здесь больше нет. Он умеет всё сам, но стилизуется     */
/*  только через appearance: base-select, то есть пока лишь в Chromium;       */
/*  ::selectedcontent не поддержан даже там, из-за чего выбранный пункт       */
/*  в закрытом поле рисовался одним слипшимся текстом; и внутри обёртки       */
/*  он рисует собственный контур. Цена отказа: клавиатуру и участие в форме   */
/*  пишем сами, а родного пикера на телефоне не будет вовсе — там             */
/*  открывается тот же самый список, отдельной мобильной ветки в коде нет.    */
/* -------------------------------------------------------------------------- */

/* --- Разметка ------------------------------------------------------------- */
/*
 *  Коробку рисует обёртка, а не поле внутри. Метка и контрол лежат в ней
 *  сеткой, поэтому высота поля берётся из содержимого, а не из зашитого
 *  отступа: поменяется размер шрифта метки — поле подстроится само.
 *
 *  Метка при этом обычный элемент потока, а не absolute. Абсолютной она
 *  места не занимает, и высоту приходилось задавать руками — замерено,
 *  57px против 62px, которые складываются сами.
 */

/* --- Что делает браузер, а что мы ----------------------------------------- */
/*
 *  Браузер (popover + popovertarget):
 *      верхний слой — список не режется overflow: hidden и не спорит
 *      с z-index; закрытие по Esc и по клику мимо; возврат фокуса
 *      на кнопку; одновременно открыт только один список.
 *
 *  CSS (anchor positioning):
 *      место под полем и переворот у края экрана. Якорь — сама обёртка,
 *      а не кнопка: кнопка ужимается чипсами, и список ужимался вместе
 *      с ней (замерено: поле 948px, список 890 → 772 → 671 → 514).
 *
 *  Мы:
 *      стрелки и Home/End, поиск по первым буквам, выбор, скрытые поля
 *      для формы.
 */

/* --- Длинный список ------------------------------------------------------- */
/*
 *  Список не растёт бесконечно: у него потолок --select-list-max и своя
 *  прокрутка. Потолок именно фиксированный, а не max-block-size: stretch
 *  «до нижнего края экрана»: со stretch высота списка зависит от того,
 *  в каком месте страницы стоит поле, и один и тот же Select выглядит
 *  по-разному сверху и снизу формы.
 *
 *  У краёв прокрутки содержимое растворяется — это подсказка, что список
 *  продолжается. И прокрутку, и растушёвку, и удержание у края приносит
 *  Scroll: тот же компонент, что ленты на страницах. Раньше всё это лежало
 *  в Select.module.css отдельной копией на шестьдесят строк.
 *
 *  Стрелок для прокрутки по наведению (как у shadcn) здесь нет намеренно:
 *  они доступны только мыши, дублируют полосу прокрутки и накрывают собой
 *  первый и последний пункт — то есть отнимают у них зону нажатия.
 *
 *  Сам список — отдельный элемент внутри поповера, а не сам поповер.
 *  Замерено: маска у поповера съедает и его собственный фон с рамкой —
 *  сквозь верхние два сантиметра видно страницу. Прокрутка и маска живут
 *  на внутреннем listbox, коробка остаётся у поповера.
 */

/* --- Выключенное поле ------------------------------------------------------ */
/*
 *  disabled уходит на кнопку, на чипсы и на скрытые поля. Последнее не мелочь:
 *  выключенное поле не участвует в форме, и без disabled у скрытых полей
 *  значение всё равно уходило бы на сервер.
 */

/* --- Клавиатура ----------------------------------------------------------- */
/*
 *  На кнопке: Enter и пробел открывают, фокус уходит на выбранный пункт
 *  или на первый. В списке: стрелки по кругу, Home и End к краям,
 *  Enter и пробел выбирают, Esc закрывает и возвращает фокус на кнопку,
 *  Tab закрывает и уходит дальше по странице.
 *
 *  Буквы ищут пункт по началу подписи — так же, как в нативном <select>:
 *  набрал «ше» — фокус прыгнул на «Шекель». Набранное живёт секунду после
 *  последней клавиши, одна и та же буква подряд шагает по пунктам на неё.
 *  Для списка из полусотни пунктов это единственный способ добраться
 *  до нужного с клавиатуры быстрее, чем сорока нажатиями стрелки.
 */
/* -------------------------------------------------------------------------- */

import {
    useId,
    useRef,
    useState,
    type CSSProperties,
    type FormEvent,
    type KeyboardEvent,
    type ReactNode,
    type ToggleEvent,
} from 'react';
import {arrowIcon} from '../../assets/icons/icon.tsx';
import {useValidity} from '../Field/Field.validity.ts';
import {Popover} from '../Popover/Popover.tsx';
import {Scroll} from '../Scroll/Scroll.tsx';
import type {SelectAccessor, SelectMultiProps, SelectProps, SelectSingleProps} from './Select.interface.ts';
import field from '../Field/Field.module.css';
import styles from './Select.module.css';

/*
 * Выключенные пункты сюда не попадают, и это не мелочь: по этому списку
 * ходят стрелки, с него начинается фокус при открытии и по нему ищет
 * набор букв. Пока выключенные были в списке, стрелка вставала на пункт,
 * который нельзя выбрать, подсветка фокуса уезжала с выбранного на него,
 * а Enter не делал ничего. Мышь до них не добирается и так —
 * у выключенного пункта pointer-events: none.
 */
const OPTION_SELECTOR = '[role="option"]:not([aria-disabled="true"])';
/* Сколько живёт набранное. Столько же держит нативный <select>. */
const TYPEAHEAD_LIFE = 1000;

function Select<T>({
                       items,
                       label,
                       variant = 'single',
                       itemLabel,
                       itemValue,
                       itemText,
                       itemRender,
                       itemDisabled,
                       chipRender,
                       name,
                       disabled = false,
                       required = false,
                       error,
                       value,
                       defaultValue,
                       onChange,
                       className = '',
                       style,
                       ...props
                   }: SelectProps<T>) {

    const [own, setOwn] = useState<string[]>(() => toList(defaultValue));
    /*
     * role="combobox" обязывает иметь aria-expanded явно: неявный,
     * который popovertarget даёт обычной кнопке, переопределённую роль
     * не покрывает — axe даёт critical по WCAG 4.1.2. Отсюда состояние,
     * и это единственная перерисовка на открытие и на закрытие.
     */
    const [open, setOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const proxyRef = useRef<HTMLInputElement>(null);
    /* Набранное для поиска по буквам. Состоянием быть не должно:
       разметку оно не меняет, а перерисовку на каждую букву стоило бы. */
    const searchRef = useRef({text: '', timer: 0});

    const id = useId();
    const validity = useValidity(error);

    /* Поповер и список — разные элементы: popovertarget указывает
       на первый, aria-controls на второй. */
    const popupId = `${id}-popup`;
    const listId = `${id}-list`;
    const labelId = `${id}-label`;
    const valueId = `${id}-value`;
    const errorId = `${id}-error`;
    /* Якорь на обёртке, а не на кнопке: кнопку ужимают чипсы. */
    const anchor = `--select-${id.replace(/[^\w-]/g, '-')}` as const;

    const multi = variant === 'multi';
    const selected = value === undefined ? own : toList(value);
    const chosen = items.filter((item, index) => selected.includes(key(item, index)));

    return (
        <div className={[field.group, className].filter(Boolean).join(' ')} style={style}>
            <div
                {...props}
                data-variant={variant}
                data-filled={selected.length > 0 || undefined}
                data-invalid={validity.invalid || undefined}
                className={[field.field, styles.field].join(' ')}
                style={{anchorName: anchor} as CSSProperties}
            >
                <span id={labelId} className={field.label}>{label}</span>

                {/* Свой класс рядом с общим: правила ниже цепляются
                    за него, а хеш у модулей свой на каждый файл —
                    по одному только field.row из Select.module.css
                    не попасть. */}
                <div className={[field.row, styles.row].join(' ')}>
                    {multi && chosen.map((item, index) => (
                        <button
                            key={key(item, index)}
                            type="button"
                            className={styles.chip}
                            disabled={disabled}
                            aria-label={`Убрать ${textOf(item, index)}`}
                            onClick={() => toggle(key(item, index))}
                        >
                            <span aria-hidden="true">{chipRender ? chipRender(item) : labelOf(item)}</span>
                            <span className={styles.chipRemove} aria-hidden="true">×</span>
                        </button>
                    ))}

                    <button
                        type="button"
                        id={id}
                        ref={buttonRef}
                        role="combobox"
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        aria-controls={listId}
                        disabled={disabled}
                        aria-labelledby={`${labelId} ${valueId}`}
                        aria-describedby={validity.invalid ? errorId : undefined}
                        aria-invalid={validity.invalid || undefined}
                        aria-required={required || undefined}
                        popoverTarget={disabled ? undefined : popupId}
                        className={[field.control, styles.control].join(' ')}
                    >
                        <span id={valueId} className={styles.value}>
                            {multi
                                ? <span className={field.srOnly}>{count(selected.length)}</span>
                                : chosen[0] !== undefined && (itemRender ? itemRender(chosen[0]) : labelOf(chosen[0]))}
                        </span>
                    </button>
                </div>

                <span className={styles.arrow} aria-hidden="true">{arrowIcon}</span>

                <Popover
                    id={popupId}
                    ref={popupRef}
                    /* Коробка, а не узел дерева доступности: замерено, что
                       Chromium отдаёт голому <div popover> роль group, и над
                       списком появлялась безымянная группа. С presentation
                       узел уходит, listbox внутри остаётся на месте. */
                    role="presentation"
                    anchor={anchor}
                    className={styles.popup}
                    onToggle={handleToggle}
                >
                    {/*
                      * Прокрутку, удержание у края и растушёвку приносит Scroll.
                      * Роль, имя и tabIndex он не трогает: свои он ставит,
                      * только если снаружи ничего не передали, — а здесь
                      * передано всё.
                      */}
                    <Scroll
                        axis="block"
                        fade
                        trap
                        id={listId}
                        ref={listRef}
                        role="listbox"
                        aria-multiselectable={multi || undefined}
                        aria-labelledby={labelId}
                        tabIndex={-1}
                        className={styles.list}
                        onKeyDown={handleListKeyDown}
                    >
                        {items.map((item, index) => {
                            const raw = key(item, index);
                            const off = flag(item, itemDisabled);

                            return (
                                // Клавиатура не на самом пункте: Enter/Space ловит
                                // onKeyDown на списке выше и жмёт activeElement.click() —
                                // это тот же клик, roving tabindex на всю группу.
                                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                                <div
                                    key={raw}
                                    role="option"
                                    tabIndex={-1}
                                    aria-selected={selected.includes(raw)}
                                    aria-disabled={off || undefined}
                                    className={styles.option}
                                    onClick={() => !off && toggle(raw)}
                                >
                                    {itemRender ? itemRender(item) : labelOf(item)}
                                </div>
                            );
                        })}
                    </Scroll>
                </Popover>

                {/* По полю на значение: FormData.getAll(name) вернёт массив —
                    так же ведут себя select multiple и группа флажков. */}
                {name && selected.map(raw => (
                    <input key={raw} type="hidden" name={name} value={raw} disabled={disabled}/>
                ))}

                {/* Спутник проверки: скрытые поля выше в проверке формы
                    не участвуют (type="hidden" исключён из неё), поэтому
                    required держит он. Имени у него нет — он ничего
                    не отправляет. */}
                {required && (
                    <input
                        ref={proxyRef}
                        required
                        disabled={disabled}
                        /*
                         * Имени у спутника нет — иначе он отправлял бы
                         * значение вторым полем. А вот id нужен: без имени
                         * И без id браузер считает поле безымянным и пишет
                         * в Issues «A form field element should have an id
                         * or name attribute» (замерено — это подсказка
                         * про автозаполнение, а не про доступность).
                         */
                        id={`${id}-validity`}
                        autoComplete="off"
                        tabIndex={-1}
                        aria-hidden="true"
                        value={selected.join(',')}
                        className={styles.validity}
                        onChange={ignore}
                        onFocus={handleProxyFocus}
                        onInvalid={validity.report}
                    />
                )}

            </div>

            {/* Под коробкой, а не в ней: сообщение относится к полю целиком.
                Область лежит в разметке всегда — объявляется только то,
                что появилось в уже существующей области. */}
            <span id={errorId} className={field.message} aria-live="polite">{validity.message}</span>
        </div>
    );

    /*
     * Фокус браузер наводит на спутник — уводим его на кнопку: невидимое
     * поле в фокусе это тупик, из которого человеку некуда деться.
     */
    function handleProxyFocus(event: FormEvent<HTMLInputElement>) {
        event.preventDefault();
        buttonRef.current?.focus();
    }

    function key(item: T, index: number) {
        return String(valueOf(item, itemValue, index));
    }

    function labelOf(item: T): ReactNode {
        return pick(item, itemLabel, item as ReactNode);
    }

    /*
     * Текстовое имя для «Убрать …». Разметка именем быть не может,
     * поэтому: сперва itemText, потом подпись, если она текст, и в самом
     * конце значение — безымянной кнопка не останется ни при каком
     * itemLabel (замерено: раньше выходило «Убрать » и пустое имя).
     */
    function textOf(item: T, index: number) {
        if (itemText !== undefined) return String(pick(item, itemText, ''));

        const raw = labelOf(item);

        return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : key(item, index);
    }

    function options() {
        return Array.from(listRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? []);
    }

    function toggle(raw: string) {
        const next = multi
            ? selected.includes(raw) ? selected.filter(item => item !== raw) : [...selected, raw]
            : [raw];

        if (value === undefined) setOwn(next);
        /* Выбрали — сообщение уходит сразу: спутник узнает об этом
           только на следующей отрисовке, а показывать ошибку уже незачем. */
        if (next.length > 0) validity.drop();
        const picked = items.filter((item, index) => next.includes(key(item, index)));

        if (multi) (onChange as SelectMultiProps<T>['onChange'])?.(next, picked);
        else (onChange as SelectSingleProps<T>['onChange'])?.(next[0] ?? null, picked[0] ?? null);

        /* Один выбирают один раз: список закрывается, а фокус на кнопку
           возвращает браузер — hidePopover() делает это сам. */
        if (!multi) popupRef.current?.hidePopover();
    }

    function handleToggle(event: ToggleEvent<HTMLDivElement>) {
        setOpen(event.newState === 'open');
        /* Закрыли — набранное не продолжают: следующее открытие начинает
           поиск с чистого листа. */
        forget();
        if (event.newState !== 'open') return;

        /* Открыли — фокус на уже выбранном пункте, а если его нет, на первом.
           Прокрутку до него делает браузер, а scroll-padding у списка не даёт
           пункту встать под растушёвкой (замерено: шаг стрелкой оставляет
           до нижнего края ровно --select-fade). */
        const list = options();
        const current = list.findIndex(option => option.getAttribute('aria-selected') === 'true');
        (list[current] ?? list[0])?.focus();
    }

    function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const list = options();
        const current = list.indexOf(document.activeElement as HTMLElement);
        const last = list.length - 1;
        const next = {
            ArrowDown: current >= last ? 0 : current + 1,
            ArrowUp: current <= 0 ? last : current - 1,
            Home: 0,
            End: last,
        }[event.key];

        if (next !== undefined) {
            event.preventDefault();
            list[next]?.focus();

            return;
        }
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            (document.activeElement as HTMLElement | null)?.click();

            return;
        }
        if (event.key === 'Tab') {
            popupRef.current?.hidePopover();

            return;
        }

        typeahead(event);
    }

    /*
     * Поиск по первым буквам. Стрелки и Esc сюда не доходят — они разобраны
     * выше, а event.key длиной в один символ отсекает служебные клавиши
     * разом: у них имена длиннее («ArrowDown», «Escape»). Модификаторы
     * исключены отдельно, иначе Ctrl+F страницы искал бы по списку.
     */
    function typeahead(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;

        const search = searchRef.current;
        /* Та же буква подряд — не «аа», а шаг по пунктам на эту букву:
           так ведёт себя нативный <select>. */
        const repeat = search.text.length > 0 && search.text === event.key.toLowerCase().repeat(search.text.length);

        window.clearTimeout(search.timer);
        search.timer = window.setTimeout(forget, TYPEAHEAD_LIFE);
        search.text = repeat ? event.key.toLowerCase() : search.text + event.key.toLowerCase();

        const list = options();
        const current = list.indexOf(document.activeElement as HTMLElement);
        /* Длинное набранное уточняет уже найденное, поэтому ищем с текущего
           пункта; одна буква и повтор — с соседнего, иначе шага не выйдет. */
        const from = search.text.length > 1 && !repeat ? current : current + 1;
        const found = seek(list, search.text, from);

        if (found === undefined) return;

        event.preventDefault();
        found.focus();
    }

    function forget() {
        window.clearTimeout(searchRef.current.timer);
        searchRef.current.text = '';
    }
}

/* -------------------------------------------------------------------------- */
/*  Доступ к полям элемента                                                   */
/* -------------------------------------------------------------------------- */

/*
 * Спутник проверки значение не меняет — его ставит компонент. Обработчик
 * нужен только React: полю со значением он его требует, а readOnly вместо
 * него вывел бы поле из проверки формы.
 */
function ignore() {}

/*
 * Пункт, чья подпись начинается с набранного. Ищем по кругу от указанного
 * места, текст берём из самой разметки, а не из items: подпись может быть
 * собрана itemRender из чего угодно, а в дереве доступности и перед глазами
 * человека остаётся именно этот текст. Выключенные пункты пропускаем —
 * фокус на них ничего не даёт.
 */
function seek(list: HTMLElement[], text: string, from: number) {
    for (let step = 0; step < list.length; step += 1) {
        const option = list[(from + step + list.length) % list.length];

        if (option === undefined || option.getAttribute('aria-disabled') === 'true') continue;
        if ((option.textContent ?? '').trim().toLowerCase().startsWith(text)) return option;
    }

    return undefined;
}

function toList(value: unknown): string[] {
    if (value === undefined || value === null || value === '') return [];

    return Array.isArray(value) ? value.map(String) : [String(value)];
}

function count(selected: number) {
    return selected === 0 ? 'ничего не выбрано' : `выбрано ${selected}`;
}

function pick<T, R>(item: T, accessor: SelectAccessor<T, R> | undefined, fallback: R): R {
    if (accessor === undefined) return fallback;
    if (typeof accessor === 'function') return accessor(item);

    return (item as Record<string, unknown>)[accessor] as R;
}

function valueOf<T>(item: T, accessor: SelectAccessor<T, string | number> | undefined, index: number) {
    const raw = pick(item, accessor, item as unknown as string | number);

    return typeof raw === 'string' || typeof raw === 'number' ? raw : index;
}

function flag<T>(item: T, accessor: SelectAccessor<T, boolean> | undefined) {
    return pick(item, accessor, false);
}

export {Select};