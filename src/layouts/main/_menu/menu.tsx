// menu.tsx

/* -------------------------------------------------------------------------- */
/*  СПИСОК КОМПОНЕНТОВ                                                        */
/*                                                                            */
/*  Это и есть полоса вкладок: role="tablist" с кнопками role="tab".          */
/*  Своего состояния у меню нет — открытую вкладку держит App.                */
/* -------------------------------------------------------------------------- */

/* --- Почему не Wrapper as={Tabs.Buttons} ----------------------------------- */
/*
 *  Вид полосы целиком приносит вариант PILL: замерено в Chromium 141 —
 *  padding 4px, border-radius 12px, фон rgb(35, 39, 42). Обёртка нужна
 *  там, где такого вида нет; здесь она его дублирует.
 *
 *  С Wrapper as={Tabs.Buttons} на одном элементе сходятся два набора
 *  правил на одни и те же свойства. Замерено: видимых значений не
 *  меняется (4px / 12px / rgb(35, 39, 42) — .pill стоит в сборке
 *  позже и побеждает), хотя .card просит padding
 *  clamp(1rem, 3cqi, 2rem) и radius 1.5rem. То есть вид полосы решает
 *  порядок файлов в бандле, а не замысел: стоит Wrapper уехать в сборке
 *  ниже — и вместо 4px станет 16…32px. Заодно на полосе появляется
 *  container-type: inline-size, который ей не нужен.
 */

/* --- Почему нет слушателя resize ------------------------------------------- */
/*
 *  Липкость, ширина и направление полосы — оформление, и его целиком
 *  делает @media в menu.module.css: ни одной перерисовки React.
 *  Из JS приходит только ориентация вкладок (App), потому что от неё
 *  зависит не вид, а поведение: aria-orientation и то, какие стрелки
 *  ведут по кнопкам.
 */
/* -------------------------------------------------------------------------- */

import {Tabs} from 'component/Tabs/Tabs.tsx';
import type {MenuProps} from '../main.interface.ts';
import styles from './menu.module.css';


export default function Menu({pages}: MenuProps) {
    return (
        <Tabs.Buttons className={styles.menu} label={'Компоненты'}>
            {Object.keys(pages).map(name => (
                <Tabs.Button key={name} value={name}>{title(name)}</Tabs.Button>
            ))}
        </Tabs.Buttons>
    );
}


function title(name: string) {
    return name.replace(/^./, first => first.toUpperCase());
}
