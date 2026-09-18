/**
 * Invoker Commands API — декларативные триггеры.
 *
 * `<button commandfor="id" command="show-modal">` открывает диалог, закрывает
 * его, переключает поповер — без состояния и без обработчиков. Для <dialog>
 * это единственный способ обойтись без JS: атрибута вроде popovertarget
 * у диалога нет.
 *
 * Браузер эти атрибуты понимает (проверено в Chromium 141: команды
 * show-modal, close и toggle-popover отрабатывают, React отдаёт атрибуты
 * в DOM без предупреждений), а @types/react 19.2 — ещё нет. Этот файл
 * закрывает разрыв и станет не нужен, когда типы их получат.
 *
 * Поддержка движками неравномерная и новее, чем у popovertarget. Если
 * команда не поддерживается, кнопка просто ничего не делает — предусмотрите
 * это там, где диалог критичен для сценария.
 */
import 'react';

/** Команды над <dialog> и над элементами с атрибутом popover. */
type DialogCommand = 'show-modal' | 'close' | 'request-close';
type PopoverCommand = 'toggle-popover' | 'show-popover' | 'hide-popover';

declare module 'react' {
    /* Параметр T не используется, но обязан совпадать с исходным
       объявлением ButtonHTMLAttributes<T> — иначе это не дополнение
       интерфейса, а новый интерфейс с тем же именем. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ButtonHTMLAttributes<T> {
        /**
         * Что сделать с элементом из commandfor. Своя команда пишется
         * с двумя дефисами в начале и ловится событием `command`.
         */
        command?: DialogCommand | PopoverCommand | `--${string}`
        /**
         * id элемента, которым управляет кнопка.
         *
         * Именно в нижнем регистре. React 19.2 про этот атрибут не знает,
         * и camelCase-написание commandFor он считает неизвестным пропом:
         * в dev-сборке это предупреждение в консоли («React does not
         * recognize the commandFor prop on a DOM element»), в production —
         * молчание, потому что там такие проверки вырезаны. Атрибут
         * в нижнем регистре React отдаёт в DOM как есть и не проверяет.
         */
        commandfor?: string
    }
}
