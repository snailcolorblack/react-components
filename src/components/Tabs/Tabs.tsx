// Tabs.tsx

/* -------------------------------------------------------------------------- */
/*  ВКЛАДКИ                                                                   */
/*                                                                            */
/*  Нативных вкладок в HTML нет — ни элемента, ни атрибута. Поэтому роли      */
/*  расставлены руками по паттерну tabs из APG, а платформе отдано всё        */
/*  остальное: кнопки это <button>, панели прячет hidden, поиск по странице   */
/*  работает сам.                                                             */
/*                                                                            */
/*  Что рассматривалось вместо этого и почему не взято:                       */
/*                                                                            */
/*      радиогруппа + :has() — переключение целиком на CSS, роверинг фокуса   */
/*      и стрелки достаются от платформы даром (замерено: один таб-стоп,      */
/*      стрелка меняет и вариант, и панель). Но в дереве доступности это      */
/*      group + radio, то есть «переключатель, 1 из 2» вместо «вкладка»,      */
/*      а внутри формы группа ещё и отправляет значение;                      */
/*                                                                            */
/*      ссылки и :target — состояние в адресе, работает кнопка «назад»,       */
/*      но озвучивается как ссылки, и :target на странице один, так что       */
/*      два набора вкладок не ужились бы;                                     */
/*                                                                            */
/*      <details name> — замерено: две group и два таб-стопа. Это аккордеон.  */
/* -------------------------------------------------------------------------- */

/* --- Что делает браузер, а что мы ----------------------------------------- */
/*
 *  Браузер:
 *      нажатие и фокус кнопок, скрытие панели по hidden, поиск по странице
 *      внутри закрытой панели (hidden="until-found") и её раскрытие.
 *
 *  Мы:
 *      роли и связи aria, стрелки с Home/End, роверинг tabindex
 *      и подхват того, что браузер раскрыл панель поиском.
 */

/* --- Смена панели ---------------------------------------------------------- */
/*
 *  Анимация целиком на CSS, в коде только одна подсказка разметке.
 *
 *  Работает это потому, что закрытая панель лежит под
 *  hidden="until-found", то есть content-visibility: hidden, а не
 *  display: none: элемент остаётся отрисованным, и переход из закрытого
 *  состояния в открытое — обычная смена стиля. Ни @starting-style,
 *  ни снятия с монтирования, ни хранения «предыдущей» панели не нужно.
 *  Уходящая панель доживает свой кадр благодаря allow-discrete
 *  у content-visibility (замерено: видима все 180 мс, гаснет в конце).
 *
 *  Подсказка — data-side у закрытой панели: лежит она до открытой
 *  или после. Сторона своя у каждой панели, поэтому «откуда приехать»
 *  не надо помнить между переключениями: панель справа всегда
 *  приезжает справа, и обратный ход получается сам.
 *
 *  Считается сторона по разметке — compareDocumentPosition у кнопок
 *  вкладок, а не по индексу в каком-нибудь списке: порядок вкладок
 *  известен только разметке, между Tabs.Button можно класть что угодно.
 */

/* --- Закрытая панель ------------------------------------------------------- */
/*
 *  hidden="until-found" вместо hidden: содержимое сохраняет прокрутку,
 *  введённый текст и загруженные данные, а Ctrl+F находит текст в закрытой
 *  вкладке и открывает её. Событие beforematch приходит перед раскрытием —
 *  по нему мы переключаем состояние, иначе браузер показал бы панель,
 *  а aria-selected осталось бы на другой кнопке.
 *
 *  Значение атрибута ставится вручную: замерено, React 19 отдаёт
 *  hidden="until-found" как обычный hidden="" — строка до разметки
 *  не доезжает. React при этом видит один и тот же проп и атрибут больше
 *  не трогает, поэтому наше значение держится до самого переключения.
 */
/* -------------------------------------------------------------------------- */

import {
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent,
} from 'react';
import {ButtonGroupShell} from '../ButtonGroup/ButtonGroup.shell.tsx';
import {slug, TabsContext, useTabs} from './Tabs.context.ts';
import type {TabsButtonProps, TabsButtonsProps, TabsContentProps, TabsProps} from './Tabs.interface.ts';
import group from '../ButtonGroup/ButtonGroup.module.css';
import styles from './Tabs.module.css';

const TAB_SELECTOR = '[role="tab"]:not([aria-disabled="true"])';

function Tabs({
                  value,
                  defaultValue,
                  onChange,
                  variant = 'LINE',
                  orientation = 'horizontal',
                  motion = 'fade',
                  className = '',
                  ...props
              }: TabsProps) {

    const [own, setOwn] = useState(() => defaultValue ?? '');

    const base = useId();
    const state = useMemo(
        () => ({base, active: value ?? own, orientation, variant, motion, select}),
        /* select берётся из замыкания этого же рендера и всегда свежий. */
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [base, value, own, orientation, variant, motion],
    );

    /* Открытое значение берём из того же объекта, что уходит в контекст:
       два источника правды разошлись бы при первой же правке. */
    const active = state.active;
    const classes = [styles.tabs, className].filter(Boolean).join(' ');

    return (
        <TabsContext value={state}>
            <div
                {...props}
                data-orientation={orientation}
                data-variant={variant}
                data-motion={motion}
                className={classes}
            />
        </TabsContext>
    );

    function select(next: string) {
        if (next === active) return;
        if (value === undefined) setOwn(next);
        onChange?.(next);
    }
}

/* -------------------------------------------------------------------------- */
/*  Полоса кнопок                                                             */
/* -------------------------------------------------------------------------- */

function TabsButtons({label, className = '', children, onKeyDown, ...props}: TabsButtonsProps) {
    const {base, orientation, variant} = useTabs('Tabs.Buttons');
    const listRef = useRef<HTMLDivElement>(null);

    /*
     * Вид полностью отдан общей оболочке — той же, что у ButtonGroup.
     * Вкладки приносят только семантику: роль списка, ориентацию и имя.
     */
    return (
        <ButtonGroupShell
            {...props}
            ref={listRef}
            role="tablist"
            variant={variant}
            pill={`--pill-${slug(base)}`}
            aria-label={typeof label === 'string' ? label : props['aria-label']}
            aria-orientation={orientation}
            className={className}
            onKeyDown={handleKeyDown}
        >
            {children}
        </ButtonGroupShell>
    );

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;

        const list = Array.from(listRef.current?.querySelectorAll<HTMLElement>(TAB_SELECTOR) ?? []);
        const current = list.indexOf(document.activeElement as HTMLElement);
        const last = list.length - 1;
        const forward = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
        const back = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
        const next = {
            [forward]: current >= last ? 0 : current + 1,
            [back]: current <= 0 ? last : current - 1,
            Home: 0,
            End: last,
        }[event.key];

        if (next === undefined) return;

        event.preventDefault();
        /*
         * Активация автоматическая: стрелка и ведёт фокус, и открывает
         * панель. Открывает через click, а не через select напрямую, —
         * тогда путь у мыши и у клавиатуры остаётся один, вместе с чужим
         * обработчиком на кнопке.
         */
        list[next]?.focus();
        list[next]?.click();
    }
}

/* -------------------------------------------------------------------------- */
/*  Кнопка                                                                    */
/* -------------------------------------------------------------------------- */

function TabsButton({value, disabled = false, className = '', onClick, ...props}: TabsButtonProps) {
    const {base, active, select} = useTabs('Tabs.Button');
    const selected = active === value;
    const key = slug(value);
    const classes = [group.item, className].filter(Boolean).join(' ');

    return (
        <button
            {...props}
            type="button"
            id={`${base}-${key}-tab`}
            role="tab"
            aria-selected={selected}
            aria-controls={`${base}-${key}-panel`}
            aria-disabled={disabled || undefined}
            /*
             * Роверинг: в табуляции только открытая вкладка. Иначе Tab
             * прошёл бы по всем кнопкам подряд, а по паттерну весь список —
             * одна остановка, внутри которой ходят стрелками.
             */
            tabIndex={selected ? 0 : -1}
            className={classes}
            onClick={handleClick}
        />
    );

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onClick?.(event);
        if (disabled || event.defaultPrevented) return;
        select(value);
    }
}

/* -------------------------------------------------------------------------- */
/*  Панель                                                                    */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Панель и обход табуляцией: решает браузер                                 */
/*                                                                            */
/*  Паттерн tabs из APG говорит про tabindex="0" у панели условно: его ставят */
/*  «когда панель не содержит ничего фокусируемого или первый элемент         */
/*  с содержимым не фокусируем». Иначе Tab из полосы обязан вести сразу       */
/*  на первую ссылку или кнопку внутри.                                       */
/*                                                                            */
/*  Ровно это условие движок уже умеет сам — keyboard-focusable scrollers.    */
/*  Замерено в Chromium 141, НИ У ОДНОГО блока нет tabindex:                  */
/*                                                                            */
/*      прокручиваемый, один текст        → остановка Tab на самом блоке      */
/*      прокручиваемый, внутри ссылка     → блок пропущен, Tab на ссылку      */
/*      непрокручиваемый, один текст      → не остановка (достигать нечего)   */
/*      hidden="until-found"              → не остановка                      */
/*                                                                            */
/*  Обход от кнопки: «start → блок с текстом → ссылка → end». То есть         */
/*  порядок по APG получается даром.                                          */
/*                                                                            */
/*  Что было, когда tabindex="0" стоял безусловно (замерено там же):          */
/*  лишняя остановка на самой панели, а следом — остановка на ЗАКРЫТОЙ,       */
/*  пустой панели. Элемент с hidden="until-found" фокусируем сам по себе:     */
/*  внутрь не пускает content-visibility, а до блока Tab доходит. Без своего  */
/*  tabindex обе остановки исчезают.                                          */
/*                                                                            */
/*  Чего это стоит. Фокус прокручиваемым областям дают Chromium 130+ (и Edge  */
/*  на нём же) и Firefox; WebKit пока нет — bug 277290 на 27.07.2026 в NEW.   */
/*  То есть в Safari панель, которая сама прокручивается и внутри которой     */
/*  нет ни ссылок, ни кнопок, с клавиатуры недостижима. Два выхода, оба       */
/*  без кода в самих вкладках:                                                */
/*                                                                            */
/*      <Tabs.Content tabIndex={0}>   — автор знает своё содержимое;          */
/*      <Scroll> внутри панели        — лента это уже решает: смотрит,        */
/*                                      есть ли внутри фокусируемое.         */
/*                                                                            */
/*  Чем это лучше вычисления в JS: чтобы повторить условие APG самим,         */
/*  нужен не только querySelector по списку фокусируемого, но и наблюдатель   */
/*  за поддеревом — содержимое панели приезжает позже неё (ленивый чанк),     */
/*  а пропсы самой панели при этом не меняются. Это два десятка строк,        */
/*  повторяющих то, что движок делает точнее и бесплатно.                     */
/* -------------------------------------------------------------------------- */

function TabsContent({value, className = '', children, tabIndex, lazy = false, ...props}: TabsContentProps) {
    const {base, active, motion, select} = useTabs('Tabs.Content');
    const panelRef = useRef<HTMLDivElement>(null);
    const [opened, setOpened] = useState(active === value);

    const selected = active === value;
    const key = slug(value);
    const classes = [styles.content, className].filter(Boolean).join(' ');

    /*
     * Открытие обязано попасть в этот же кадр: иначе панель показалась бы
     * пустой, а содержимое приехало бы кадром позже — рывком. Это та самая
     * «подстройка состояния под изменившийся проп», а не эффект.
     */
    if (lazy && selected && !opened) setOpened(true);

    /*
     * Два дела до показа кадра, и оба обязаны успеть до него.
     *
     * Первое: обычный hidden меняем на until-found — замерено, строку
     * через проп React не пропускает.
     *
     * Второе: сторона закрытой панели. Снимаем её у открывшейся и ставим
     * закрывшейся; браузер при этом сравнивает с тем, что было показано
     * в прошлом кадре, поэтому приходящая панель едет от своего края
     * к нулю, а уходящая — от нуля к своему (замерено: 16px → 0
     * и 0 → −16px у соседних вкладок).
     */
    useLayoutEffect(() => {
        const node = panelRef.current;

        if (node === null) return;
        if (selected) {
            node.removeAttribute('data-side');

            return;
        }

        node.setAttribute('hidden', 'until-found');

        if (motion !== 'slide') {
            node.removeAttribute('data-side');

            return;
        }

        node.setAttribute('data-side', sideOf(`${base}-${key}-tab`, `${base}-${slug(active)}-tab`));
    }, [active, base, key, motion, selected]);

    /*
     * Браузер нашёл текст поиском по странице и собирается раскрыть панель.
     * Без этого он показал бы содержимое, а кнопки остались бы с прежним
     * aria-selected — то есть виджет соврал бы о том, что открыто.
     */
    useEffect(() => {
        const node = panelRef.current;

        if (node === null) return;

        function reveal() {
            select(value);
        }

        node.addEventListener('beforematch', reveal);

        return () => node.removeEventListener('beforematch', reveal);
    }, [select, value]);

    return (
        <div
            {...props}
            ref={panelRef}
            id={`${base}-${key}-panel`}
            role="tabpanel"
            aria-labelledby={`${base}-${key}-tab`}
            hidden={!selected || undefined}
            /* -------------------------------------------------------- */
            /*  Своего tabindex у панели нет — см. длинный разбор ниже.  */
            /* -------------------------------------------------------- */
            tabIndex={tabIndex}
            className={classes}
        >
            {lazy && !opened ? null : children}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Сторона закрытой панели                                                   */
/*                                                                            */
/*  Лежит её вкладка до открытой или после. Спрашиваем разметку, а не         */
/*  список значений: порядок вкладок знает только она — между кнопками        */
/*  можно класть разделители, заголовки и что угодно ещё, и никакого          */
/*  массива с порядком у компонента нет.                                      */
/*                                                                            */
/*  Пока не открыта ни одна вкладка, открытой кнопки не существует —          */
/*  сторона тогда любая, панель всё равно не двигается.                       */
/* -------------------------------------------------------------------------- */

function sideOf(mine: string, live: string) {
    const from = document.getElementById(mine);
    const to = document.getElementById(live);

    if (from === null || to === null) return 'after';

    const where = from.compareDocumentPosition(to);

    return (where & Node.DOCUMENT_POSITION_PRECEDING) === 0 ? 'before' : 'after';
}

Tabs.Buttons = TabsButtons;
Tabs.Button = TabsButton;
Tabs.Content = TabsContent;

export {Tabs};
