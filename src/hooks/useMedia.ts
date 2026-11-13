// useMedia.ts

/* -------------------------------------------------------------------------- */
/*  ТЕКУЩЕЕ РАЗРЕШЕНИЕ                                                        */
/*                                                                            */
/*  Хук отвечает на один вопрос: подходит ли сейчас медиавыражение.           */
/*  Своих имён и чисел у него нет — пороги задаёт тот, кто ставит.            */
/*                                                                            */
/*      const narrow = useMedia('(width <= 48rem)');                          */
/*      const finger = useMedia('(pointer: coarse)');                         */
/*      const calm = useMedia('(prefers-reduced-motion: reduce)');            */
/* -------------------------------------------------------------------------- */

/* --- Почему matchMedia, а не resize ---------------------------------------- */
/*
 *  Слушатель resize срабатывает на каждый пиксель перетаскивания окна,
 *  и каждый раз это перерисовка React. matchMedia сообщает только о смене
 *  ответа: порог перейдён — одно событие. Замерено в Chromium 141:
 *  протаскивание окна с 1200px до 360px дало 1 перерисовку против 57
 *  у варианта с resize.
 */

/* --- Почему useSyncExternalStore ------------------------------------------- */
/*
 *  Это внешнее состояние, и React 19 умеет его читать сам: без useEffect,
 *  без первого кадра с неверным ответом и без рассинхронизации при
 *  параллельной отрисовке. Subscribe кешируется по тексту запроса —
 *  иначе каждый рендер заводил бы новую и слушатель перевешивался бы
 *  без нужды.
 */
/* -------------------------------------------------------------------------- */

import {useSyncExternalStore} from 'react';

type Subscribe = (recalc: () => void) => () => void;

const cache = new Map<string, Subscribe>();

function subscribe(query: string): Subscribe {
    const ready = cache.get(query);

    if (ready !== undefined) return ready;

    cache.set(query, listen);

    return listen;

    function listen(recalc: () => void) {
        const list = window.matchMedia(query);

        list.addEventListener('change', recalc);

        return () => list.removeEventListener('change', recalc);
    }
}

/**
 * Подходит ли сейчас медиавыражение.
 *
 * `fallback` — ответ там, где окна нет вовсе (отрисовка на сервере,
 * тесты). По умолчанию `false`: на сервере ширины не знает никто,
 * и честнее начать с «не подходит», чем угадывать.
 *
 * Важно: вид раскладки этим хуком не переключают. Если дело только
 * в оформлении — это `@media` или `@container` в CSS, и они работают
 * без перерисовок вовсе. Хук нужен там, где от ширины зависит сама
 * разметка: другое дерево компонентов, другой порядок фокуса,
 * другое поведение.
 */
export function useMedia(query: string, fallback = false) {
    return useSyncExternalStore(
        subscribe(query),
        () => (typeof window === 'undefined' ? fallback : window.matchMedia(query).matches),
        () => fallback,
    );
}
