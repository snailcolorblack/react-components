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
                  className = '',
                  ...props
              }: TabsProps) {

    const [own, setOwn] = useState(() => defaultValue ?? '');

    const base = useId();
    const state = useMemo(
        () => ({base, active: value ?? own, orientation, variant, select}),
        /* select берётся из замыкания этого же рендера и всегда свежий. */
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [base, value, own, orientation, variant],
    );

    /* Открытое значение берём из того же объекта, что уходит в контекст:
       два источника правды разошлись бы при первой же правке. */
    const active = state.active;

    return (
        <TabsContext value={state}>
            <div
                {...props}
                data-orientation={orientation}
                data-variant={variant}
                className={[styles.tabs, className].filter(Boolean).join(' ')}
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
            className={[group.item, className].filter(Boolean).join(' ')}
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

function TabsContent({value, className = '', ...props}: TabsContentProps) {
    const {base, active, select} = useTabs('Tabs.Content');
    const panelRef = useRef<HTMLDivElement>(null);

    const selected = active === value;
    const key = slug(value);

    /*
     * Обычный hidden меняем на until-found сразу после отрисовки, до показа
     * кадра: замерено, строку через проп React не пропускает.
     */
    useLayoutEffect(() => {
        if (selected) return;

        panelRef.current?.setAttribute('hidden', 'until-found');
    }, [selected]);

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
            /* Панель фокусируема: иначе до текста без ссылок и кнопок
               с клавиатуры не добраться. */
            tabIndex={0}
            className={[styles.content, className].filter(Boolean).join(' ')}
        />
    );
}

Tabs.Buttons = TabsButtons;
Tabs.Button = TabsButton;
Tabs.Content = TabsContent;

export {Tabs};
