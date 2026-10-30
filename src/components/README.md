# Карта компонентов

Кто на кого опирается, от примитивного к составному, и где ещё остаётся
копия чужого кода. Замеры — Chromium 141, если не сказано иное.

## Слои

Ярус 0 — ничего не импортируют, только платформа и токены:

    Button  Popover  Typography  Scroll  Alert  Dialog  Accordion  Fieldset
    Progress
    Wrapper (коробка вместо <div>: отступы, скругление, фон и снятие
             собственных стилей тега, которым она отрисовалась)
    Flow    (процесс на несколько страниц: состояние, адрес и черновик,
             вида у него нет вовсе — рисует только текущий шаг)
    JsonViewer
    Control (только стили и типы, компонента нет)
    Field   (только стили, типы, Field.focus.ts, Field.validity.ts)
    Scroll.wheel.ts (перехват колеса, живёт отдельно от самого Scroll)

Ярус 1 — берут один ярус 0:

    Form      → Wrapper (сбор значений, проверка и отправка; своей
                проверки нет — её подключают пропом validate)
    Container → Wrapper (предел ширины, середина страницы и поля
                до краёв экрана; отступ только у верхнего)
    Input    → Field
    Textarea → Field
    Checkbox → Field, Control
    Radio    → Field, Control
    Switch   → Field, Control
    Range    → Field
    Toast    → Alert
    Dropdown → Popover, Button
    Pagination → Button
    Breadcrumbs → Button
    ButtonGroup → Scroll.wheel.ts

Ярус 2 — берут ярус 1:

    Select → Field, Popover, Scroll
    Tabs   → ButtonGroup (через ButtonGroupShell)

Ничего не переиспользует: `Typography`, `Dialog`, `Accordion`, `Fieldset`,
`Tooltip`. Из них `Tooltip` и `Typography` — кандидаты (см. ниже),
`Dialog` и `Accordion` обоснованно сами по себе: у первого `<dialog>`
с `showModal()`, а не поповер, у второго `<details>` с `<summary>`.

## Что уже объединено

| Общее                  | Кто берёт                      |
|------------------------|--------------------------------|
| `Field.module.css`     | Input, Textarea, Select, Range, Checkbox, Radio, Switch |
| `Field.validity.ts`    | Input, Textarea, Select, Range, Checkbox, Radio, Switch |
| `Control.module.css`   | Checkbox, Radio, Switch (частично) |
| `Popover`              | Select, Dropdown               |
| `Button`               | Dropdown, Tabs, Pagination, Breadcrumbs |
| `Scroll`               | Select (список)                |
| `Scroll.wheel.ts`      | Scroll, ButtonGroupShell       |
| `ButtonGroupShell`     | ButtonGroup, Tabs.Buttons      |
| `Alert`                | Toast                          |
| `Wrapper`              | Form, Container                |

## Что остаётся сделать

Порядок — по отношению пользы к риску.

### 1. Длинный список Dropdown → Scroll

Не оптимизация, а дефект. Замерено: меню из 40 пунктов — 1610px в окне
высотой 800px, **964px вне экрана**; `max-block-size: none`,
`scrollHeight − clientHeight = 0`, то есть меню не прокручивается вовсе.
Фокус на последнем пункте («Действие 40») уезжает страницей, сам пункт
остаётся невидим: низ на 1699px при окне 800px.

У Select эта же задача уже решена Scroll'ом, и разметка у Dropdown ровно
та же: `Popover` с `role="menu"` снаружи, пункты внутри. Перенос — тот же,
что сделан в Select: роль уходит внутрь, на `Scroll axis="block" fade trap`,
поповер становится `role="presentation"`.

Строк: +6 (потолок высоты и переменная прокрутки), −0. Риск: низкий —
путь пройден на Select, тесты Dropdown проверяют роли и клавиатуру.

### 2. Tooltip → Popover

Подсказка несёт копию привязки поповера, и копия беднее оригинала:

* `PLACEMENT` в `Tooltip.tsx` — 18 строк, та же таблица, что в
  `Popover.tsx`, с заменой `--popover-gap` на `--tooltip-gap`;
* `tooltipStyle` — 8 строк, тот же перенос таблицы в переменные;
* `@supports (position-area: …)` в CSS — 19 строк против 60 у поповера:
  у подсказки три `position-try-fallbacks` и нет разбора узкого экрана,
  который у `Popover` замерен и сделан (`position-try-order: most-width`
  на 48rem);
* шесть переменных `--tooltip-{bg,fg,border,gap,inset,duration}` —
  переименованные `--popover-*`.

`Popover` уже принимает `popover="hint"` и `anchor` — ровно то, что нужно
подсказке. Остаётся своим только то, чего у платформы нет: задержка
по наведению, удержание при наведении на саму подсказку (WCAG 1.4.13)
и `anchor-name` на триггере.

Эталон для сверки после переноса (замерено сейчас, `showPopover()`):
зазор до кнопки 4px, размер 256×52, `position-area: start span-end`,
`position-anchor` совпадает с `anchor-name` триггера, отступ `4px 8px`,
шрифт 14px.

Строк: −45 примерно. Риск: средний — переопределять фон и отступ поповера
придётся своим классом, и подсказка не должна получить `role="group"`
от `label` (она передаёт `role="tooltip"`, а он сильнее).

### 3. Один «спрятано от глаз» вместо трёх

Один и тот же набор из девяти объявлений лежит в трёх файлах:

    Field/Field.module.css          .srOnly        11 строк
    Alert/Alert.module.css          .word          11 строк
    ButtonGroup/ButtonGroup.module.css .hiddenLegend 11 строк
    Progress/Progress.module.css    .label[data-hidden] 11 строк

Совпадение полное: `position: absolute`, `inline-size/block-size: 1px`,
`margin: -1px`, `clip-path: inset(50%)`, `overflow: hidden`, `padding: 0`,
`border: 0`, `white-space: nowrap`.

Строк: −33. Риск: низкий. Место — отдельный `src/styles/a11y.module.css`
(не Field: его берут только поля, а прячет текст и Alert с Progress).

### 4. Ходьба стрелками по списку — один помощник вместо трёх копий

Один и тот же кусок в трёх обработчиках:

    const next = {
        [вперёд]: current >= last ? 0 : current + 1,
        [назад]:  current <= 0 ? last : current - 1,
        Home: 0,
        End: last,
    }[event.key];

    Select/Select.tsx    handleListKeyDown  31 строка
    Dropdown/Dropdown.tsx handleMenuKeyDown 22 строки
    Tabs/Tabs.tsx        handleKeyDown      28 строк

Различий три, и все выносятся в аргументы: ось (у Tabs стрелки зависят
от `orientation`), что делать после перехода (Tabs ещё и щёлкает по
кнопке) и чем список набирается (`[role="option"]`, `[role="menuitem"]`,
`TAB_SELECTOR`).

Строк: −30 примерно. Риск: низкий, но затрагивает три компонента сразу —
делать отдельным шагом, с прогоном всех тестов между.

### 5. `.label` и «выключено» из Switch в Control

Switch уже берёт у Control `.group` и `.message`, но держит свои `.label`
(4 объявления, совпадают полностью) и правило выключенного состояния
(3 объявления, совпадают полностью).

Сам вид — дорожка с бегунком против коробки с галочкой — не общий:
из 11 объявлений `.input` совпадают 4, из 9 у `.input::before` — одно.
Сливать целиком незачем, переносить две общие мелочи стоит.

Строк: −12. Риск: низкий.

### 6. Один `FOCUSABLE` вместо двух разных

    Scroll/Scroll.tsx:41   'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), …'
    Tooltip/Tooltip.tsx:113 'a[href], area[href], button, input, select, textarea, summary, [tabindex]:not([tabindex^="-"])'

Два списка «что фокусируется само» расходятся в обе стороны: у Tooltip
есть `area[href]` и `summary`, которых нет у Scroll; у Scroll есть
`[contenteditable]`, `audio[controls]`, `video[controls]` и `details`,
которых нет у Tooltip. И `[tabindex="-1"]` против `[tabindex^="-"]` —
второй отсекает ещё и `-2`. Это не стиль, а разный ответ на один вопрос,
и полного из них нет ни одного.

Строк: −2, но снимает расхождение. Риск: низкий.

### 7. Прокрутка ButtonGroupShell → Scroll

Оболочка держит свои `overflow-x: auto`, `scrollbar-width: none`
и `::-webkit-scrollbar { display: none }` — это ровно `Scroll`
с `bar={false}`. Полиморфный `as` у Scroll есть, роль и `tabIndex`
он не навязывает.

Мешает `PILL`: у него `overflow: visible` нарочно, а вертикальная
раскладка (`aria-orientation="vertical"`) ещё и переключает ось. Плюс
индикатор привязан якорем внутри той же коробки.

Строк: −10. Риск: средний — выигрыш меньше, чем цена проверки. Делать
последним или не делать.

### 8. Typography не берёт никто

Шрифтовые размеры и насыщенности объявлены на месте в Accordion
(`clamp(…)`, `font-weight: 500`), Fieldset (`600`), ButtonGroup (`600`,
`--font-size-14`), Toast (`1.25rem`), Tooltip (`--font-size-14`).
У Typography при этом есть `.h1…h6`, `.lead`, `.subtitle`, `.caption`,
`.note`, `.text`.

Это не дублирование кода — это расхождение шкалы: у заголовка
аккордеона свой размер, у легенды Fieldset свой. Решать не переносом,
а разговором: либо шкала одна и компоненты берут её переменные, либо
Typography остаётся только для текста страниц. До решения ничего
не менять.

### 9. Сокращение по ширине: один приём в двух местах

`Pagination` и `Breadcrumbs` прячут лишнее одинаково: что лишнее
на узком месте, помечено `data-far` (у крошек есть ещё `data-mid` —
порог пошире), что появляется на его месте — `data-when` с именем
порога, и всё решает `@container`, без замеров в JS.
Кода там на два правила, и общего файла он не стоит; но приём один,
и третий компонент с тем же поведением стоит делать так же,
а не заводить третью его разновидность.

## Мёртвое

* `ButtonGroup.shell.tsx`, конец файла: три осиротевших комментария
  («Колесо», «Колесо шлёт пиксели…», «Проставить чужой ref…») от кода,
  переехавшего в `Scroll.wheel.ts`. Удалить — 8 строк.
* `Select.module.css`: переменные `--select-fade` и `--select-scroll-thumb`
  больше ничего не значат, настройка растушёвки и полосы идёт через
  `--scroll-fade` и `--scroll-thumb`. Если они где-то проставлены снаружи,
  там тоже нужна замена.
* `.storybook/docs.css` — удалить вручную (в прошлый раз не удалось).

## Опечатки в именах

`src/components/Accoridon/` и `Popover/Popover.interfave.ts` — переименовать
в `Accordion` и `Popover.interface.ts`. Трогает импорты в Accordion, Popover,
Select, Dropdown и их истории; делать отдельным коммитом, чтобы diff
переименования не смешался с правками.
