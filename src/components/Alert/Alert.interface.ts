// Alert.interface.ts
import type {ComponentPropsWithRef} from "react";

export type AlertVariant = 'SUCCESS' | 'WARNING' | 'ERROR';

/**
 * React 19: `ref` — обычный проп, forwardRef не требуется.
 */
export type AlertProps = ComponentPropsWithRef<"div"> & {
    variant?: AlertVariant;
    /**
     * Живой регион. По умолчанию `false`: сообщение считается статичным
     * и не зачитывается при первом рендере.
     * `true` — для сообщений, появляющихся в ответ на действие пользователя:
     * ERROR получает role="alert" (assertive), остальные — role="status" (polite).
     */
    live?: boolean;
};
