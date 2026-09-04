// Buttonst.interface.ts
import type {ComponentPropsWithRef} from "react";

export interface ButtonsPropsInterface extends ComponentPropsWithRef<'div'> {
    /** Проп дочерней кнопки, по которому определяется активность. */
    activeAttrKey?: string
    /** Значение, совпадение с которым делает кнопку активной. */
    activeAttrValue?: string | number
}
