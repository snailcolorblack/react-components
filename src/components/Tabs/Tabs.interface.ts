// Tabs.interface.ts
import type {ComponentPropsWithRef, ReactNode} from 'react';
import type {ButtonGroupVariant} from '../ButtonGroup/ButtonGroup.interface.ts';

/** Куда ходят стрелки: вдоль строки или сверху вниз. */
export type TabsOrientation = 'horizontal' | 'vertical';

/**
 * Вид вкладок — тот же набор, что у ButtonGroup, и рисует его та же
 * оболочка: `LINE` с линией под открытой вкладкой и `PILL` с таблеткой.
 * Своего оформления у вкладок нет вовсе, поэтому вид определён в одном
 * месте и не может разойтись между компонентами.
 */
export type TabsVariant = ButtonGroupVariant;

interface TabsOwnProps {
    /**
     * Открытая вкладка. Управляемый режим: значение приходит снаружи
     * и снаружи же меняется в `onChange`.
     */
    value?: string
    /**
     * Какая вкладка открыта поначалу. Без неё не открыта ни одна —
     * и это не ошибка: бывают вкладки, которые ждут выбора.
     */
    defaultValue?: string
    /** Вкладку переключили. */
    onChange?: (value: string) => void
    /**
     * Вид: линия или таблетка. По умолчанию линия.
     *
     * На разметку и роли не влияет ни один из вариантов: и там, и там это
     * `tablist` с кнопками `tab`. Меняется только оформление, поэтому
     * переключать вид можно свободно.
     */
    variant?: TabsVariant
    /**
     * Куда ходят стрелки и как стоят кнопки. По умолчанию вдоль строки.
     *
     * Уходит в `aria-orientation` списка: от этого зависит, какие клавиши
     * переключают — влево-вправо или вверх-вниз. Скринридер объявляет это
     * заранее, поэтому значение должно совпадать с тем, как кнопки стоят
     * на самом деле.
     */
    orientation?: TabsOrientation
}

/**
 * Вкладки: один набор кнопок и панели под ними.
 *
 *     <Tabs defaultValue="about">
 *         <Tabs.Buttons label="Раздел">
 *             <Tabs.Button value="about">Описание</Tabs.Button>
 *             <Tabs.Button value="reviews">Отзывы</Tabs.Button>
 *         </Tabs.Buttons>
 *
 *         <Tabs.Content value="about">Текст описания</Tabs.Content>
 *         <Tabs.Content value="reviews">Текст отзывов</Tabs.Content>
 *     </Tabs>
 *
 * Нативного элемента вкладок в HTML нет, поэтому роли расставлены руками
 * по паттерну tabs из APG: `tablist`, `tab`, `tabpanel`, `aria-selected`,
 * связи `aria-controls` и `aria-labelledby`. Замерено: в дереве доступности
 * это `tablist` и `tabpanel`, то есть скринридер говорит «вкладка, 1 из 3».
 *
 * Клавиатура: в список ведёт один Tab (в фокусе всегда открытая кнопка,
 * остальные из табуляции убраны), стрелки ходят по кругу, Home и End
 * к краям. Активация автоматическая: стрелка сразу показывает панель —
 * так по APG можно, когда содержимое уже в разметке и появляется мгновенно.
 *
 * Закрытые панели остаются в разметке под `hidden="until-found"`: у них
 * сохраняется прокрутка, введённый текст и загруженные данные, а Ctrl+F
 * находит текст внутри закрытой вкладки и открывает её сам.
 */
export type TabsProps = Omit<ComponentPropsWithRef<'div'>, 'onChange'> & TabsOwnProps;

interface TabsButtonsOwnProps {
    /**
     * Имя набора вкладок: «Раздел», «Вид отчёта».
     *
     * Обязательно. Список вкладок — это самостоятельный виджет, и без имени
     * скринридер объявит просто «список вкладок», не сказав, к чему он.
     * Если имя уже есть на странице видимым заголовком, сошлитесь на него
     * через `aria-labelledby` вместо `label`.
     */
    label?: ReactNode
}

/**
 * Полоса кнопок: `role="tablist"`.
 *
 * Здесь же живёт клавиатура — стрелки, Home и End. Кнопки ищутся в разметке,
 * поэтому между ними можно класть разделители и что угодно ещё.
 */
export type TabsButtonsProps = ComponentPropsWithRef<'div'> & TabsButtonsOwnProps;

interface TabsButtonOwnProps {
    /**
     * Какую панель открывает. Должно совпадать с `value` у `Tabs.Content`
     * и быть уникальным в пределах набора: из него строятся оба id.
     */
    value: string
    /**
     * Вкладка недоступна: нажатие не работает, стрелки её перескакивают.
     *
     * Это `aria-disabled`, а не `disabled`: выключенная кнопка выпала бы
     * из дерева доступности целиком, и человек не узнал бы, что раздел
     * вообще есть.
     */
    disabled?: boolean
}

/** Кнопка вкладки: `role="tab"`. */
export type TabsButtonProps = ComponentPropsWithRef<'button'> & TabsButtonOwnProps;

interface TabsContentOwnProps {
    /** Какой кнопке принадлежит. Должно совпадать с её `value`. */
    value: string
}

/**
 * Панель: `role="tabpanel"`.
 *
 * Закрытая остаётся в разметке под `hidden="until-found"` — сохраняет
 * состояние и находится поиском по странице. Панель получает `tabindex="0"`,
 * чтобы до её содержимого можно было добраться с клавиатуры, даже когда
 * внутри нет ни одного фокусируемого элемента.
 */
export type TabsContentProps = ComponentPropsWithRef<'div'> & TabsContentOwnProps;
