// Dialog.interface.ts
import type {ComponentPropsWithRef} from 'react';

export type DialogClosedBy = 'any' | 'closerequest' | 'none';

/**
 * Диалог всегда модальный: открывается через showModal(), поэтому получает
 * top layer, ::backdrop, ловушку фокуса, Esc и возврат фокуса на триггер.
 *
 * Два режима. Управляемый — передан open, состоянием распоряжается React.
 * Неуправляемый — open не передан, и диалог открывает разметка или ref:
 *
 *   <Button commandfor="confirm" command="show-modal">Удалить</Button>
 *   <Dialog id="confirm" label="Подтверждение">
 *       <Button commandfor="confirm" command="close">Отмена</Button>
 *   </Dialog>
 *
 * Смешивать режимы не стоит: если open передан, он и решает.
 */
export interface DialogProps extends Omit<ComponentPropsWithRef<'dialog'>, 'open'> {
    /**
     * Открыт ли диалог. Дёргает showModal() и close().
     * Не передан — React диалогом не управляет.
     */
    open?: boolean
    /**
     * Имя окна для скринридера: уходит в `aria-label`. Только строка —
     * разметку здесь показать негде, имя в ARIA это текст.
     *
     * Годится для окна без видимого заголовка. Если заголовок есть, лучше
     * не дублировать его здесь, а связать: `aria-labelledby` на его `id`.
     * Тогда имя окна и надпись в нём не разъедутся при правке текста,
     * и скринридер не прочитает одно и то же дважды — сперва именем,
     * потом содержимым.
     *
     *     <Dialog aria-labelledby="confirm-title">
     *         <Typography as="h2" id="confirm-title">Удалить черновик?</Typography>
     *     </Dialog>
     */
    label?: string
    /**
     * Чем окно закрывается. Делает это атрибут `closedby`, а не наш код.
     *
     * В движке без его поддержки компонент подменяет только клик мимо
     * при `any`; `none` и `closerequest` там не удержат Esc — закрытие
     * останется браузерным по умолчанию.
     */
    closedBy?: DialogClosedBy
}
