// Alert.tsx

/* -------------------------------------------------------------------------- */
/*  СООБЩЕНИЕ                                                                 */
/*                                                                            */
/*  Коробка с текстом и признаком важности.                                   */
/*                                                                            */
/*  Значка по умолчанию нет: withIcon включает стандартный, icon ставит       */
/*  свой. Слово («Ошибка.», «Предупреждение.», «Готово.») остаётся всегда —   */
/*  оно скрыто от глаз, но не от озвучки.                                     */
/*                                                                            */
/*  Одного цвета мало. Замерено: когда-то WARNING, SUCCESS и ERROR            */
/*  различались только цветом рамки и фона — то есть смысл нёс                */
/*  исключительно цвет (WCAG 1.4.1), а в режиме высокого контраста цвета      */
/*  подменяет система, и разница пропадала вовсе. Незрячему об этом           */
/*  говорит слово, зрячему — значок; поэтому плашка без значка в высоком      */
/*  контрасте показывает слово глазами (правило в Alert.module.css).          */
/* -------------------------------------------------------------------------- */

import {errorIcon, successIcon, warningIcon} from '../../assets/icons/icon.tsx';
import type {AlertProps, AlertVariant} from './Alert.interface.ts';
import styles from './Alert.module.css';

/** Значок и слово на каждый вариант. */
const MARK = {
    SUCCESS: {icon: successIcon, word: 'Готово.'},
    WARNING: {icon: warningIcon, word: 'Предупреждение.'},
    ERROR: {icon: errorIcon, word: 'Ошибка.'},
} satisfies Record<AlertVariant, {icon: typeof successIcon, word: string}>;

function Alert({
                   variant,
                   live = false,
                   withIcon = false,
                   icon,
                   className = '',
                   children,
                   ...props
               }: AlertProps) {
    /*
     * Роль только у живого сообщения: у статичного она объявила бы текст
     * при первой же отрисовке страницы, хотя ничего не произошло.
     * У ошибки assertive, у остальных polite — перебивать чтение стоит
     * только тем, что сломалось.
     */
    const role = live ? (variant === 'ERROR' ? 'alert' : 'status') : undefined;
    const mark = variant === undefined ? undefined : MARK[variant];
    /*
     * Значка по умолчанию нет. withIcon включает стандартный для варианта,
     * icon ставит свой — и свой показывается сам по себе, без withIcon:
     * раз его передали, значок нужен.
     */
    const shown = icon ?? (withIcon ? mark?.icon : undefined);

    return (
        <div
            role={role}
            {...props}
            data-variant={variant}
            className={className ? `${styles.alert} ${className}` : styles.alert}
        >
            {shown !== undefined && <span className={styles.icon} aria-hidden="true">{shown}</span>}
            {mark !== undefined && <span className={styles.word}>{mark.word} </span>}
            {children}
        </div>
    );
}

export {Alert};
