// Buttons.tsx
import {Children, cloneElement, isValidElement, type ReactElement} from "react";
import type {ButtonsPropsInterface} from "./Buttonst.interface.ts";
import type {ButtonProps} from "../Button/Button.interface.ts";
import styles from './Buttons.module.css';

function Buttons({
                     className = '',
                     activeAttrKey = 'value',
                     activeAttrValue,
                     children,
                     ...props
                 }: ButtonsPropsInterface) {

    return (
        <div
            role="group"
            className={`${styles.buttons} ${className}`.trim()}
            {...props}
        >
            {Children.map(children, (child) => {
                if (!isValidElement(child)) return child;

                const button = child as ReactElement<ButtonProps>;
                const valueFromChild = (button.props as Record<string, unknown>)[activeAttrKey];
                const isActive = valueFromChild != null && valueFromChild === activeAttrValue;

                return cloneElement(button, {
                    active: isActive,
                    variant: 'CONTRAST',
                    // Собственный className кнопки сохраняется, а не затирается.
                    className: `${styles.buttonInner} ${button.props.className ?? ''}`.trim(),
                    // В сегментированной группе кнопка — переключатель,
                    // поэтому состояние должно быть доступно скринридеру.
                    'aria-pressed': isActive,
                });
            })}
        </div>
    );
}

export {Buttons};
