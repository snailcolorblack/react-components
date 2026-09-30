// Alert.tsx

/* -------------------------------------------------------------------------- */
/*  СООБЩЕНИЕ                                                                 */
/*                                                                            */
/*  Коробка с текстом и признаком важности. Вариант показан тремя вещами      */
/*  сразу: цветом, значком и словом.                                          */
/*                                                                            */
/*  Одного цвета мало. Замерено: до этой правки WARNING, SUCCESS и ERROR      */
/*  различались только цветом рамки и фона, ::before был пуст — то есть       */
/*  смысл нёс исключительно цвет (WCAG 1.4.1). В режиме высокого контраста    */
/*  цвета подменяет система, и разница пропадала вовсе.                       */
/*                                                                            */
/*  Значок декоративный (aria-hidden): он повторяет то, что уже сказано       */
/*  словом. Слово скрыто от глаз, но не от озвучки — зрячий видит значок,     */
/*  незрячий слышит «Ошибка.» перед текстом.                                  */
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
    const shown = icon ?? mark?.icon;

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
