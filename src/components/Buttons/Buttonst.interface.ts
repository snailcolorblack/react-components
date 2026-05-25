import type {HTMLAttributes} from "react";

export interface ButtonsPropsInterface extends HTMLAttributes<HTMLDivElement>{
    activeAttrKey?: string
    activeAttrValue?: string | number
}