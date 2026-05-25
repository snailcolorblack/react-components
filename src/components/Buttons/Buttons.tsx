import {Children, cloneElement, isValidElement, type ReactElement} from "react";
import type {ButtonsPropsInterface} from "./Buttonst.interface.ts";
import type {ButtonProps} from "../Button/Button.interface.ts";
import styles from './Buttons.module.css';

const Buttons = ({
                     className = '',
                     activeAttrKey = 'value',
                     activeAttrValue,
                     children,
                     ...props
                 }: ButtonsPropsInterface) => {

    return (
        <div className={`${styles.buttons} ${className}`.trim()} {...props}>
            {Children.map(children, (child) => {
                if (!isValidElement(child)) return child;

                const valueFromChild = (child.props as Record<string, unknown>)[activeAttrKey];
                const isActive =
                    valueFromChild != null &&
                    valueFromChild === activeAttrValue;

                return cloneElement(child as ReactElement<ButtonProps>, {
                    active: isActive,
                    variant: 'CONTRAST',
                    className: styles.buttonInner
                });
            })}
        </div>
    );
}

Buttons.displayName = 'Buttons';
export {Buttons};


