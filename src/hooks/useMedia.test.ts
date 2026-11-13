import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {useMedia} from './useMedia.ts';

/*
 * Хук отвечает на один вопрос и держит ответ в согласии с движком.
 * Здесь matchMedia подменён управляемым: в jsdom настоящего нет,
 * а ширину окна всё равно никто не считает.
 */

interface Fake {
    media: string
    matches: boolean
    listeners: Set<() => void>
}

const lists = new Map<string, Fake>();
let made = 0;
let subscriptions = 0;
let original: typeof window.matchMedia;

function fake(query: string) {
    const ready = lists.get(query);

    if (ready !== undefined) return ready;

    const list: Fake = {media: query, matches: false, listeners: new Set()};

    lists.set(query, list);

    return list;
}

/** Сменить ответ движка и разослать событие, как сделал бы браузер. */
function flip(query: string, matches: boolean) {
    const list = fake(query);

    list.matches = matches;
    act(() => list.listeners.forEach(call => call()));
}

beforeEach(() => {
    original = window.matchMedia;
    lists.clear();
    made = 0;
    subscriptions = 0;

    window.matchMedia = ((query: string) => {
        const list = fake(query);

        made += 1;

        return {
            media: list.media,
            get matches() { return list.matches },
            onchange: null,
            addEventListener(_type: string, call: () => void) {
                subscriptions += 1;
                list.listeners.add(call);
            },
            removeEventListener(_type: string, call: () => void) {
                subscriptions -= 1;
                list.listeners.delete(call);
            },
            addListener() {},
            removeListener() {},
            dispatchEvent: () => false,
        };
    }) as unknown as typeof window.matchMedia;
});

afterEach(() => {
    window.matchMedia = original;
});

describe('useMedia', () => {
    it('отдаёт ответ движка на свой запрос', () => {
        flip('(width > 540px)', true);

        const {result} = renderHook(() => useMedia('(width > 540px)'));

        expect(result.current).toBe(true);
    });

    it('следит за сменой ответа, а не за каждым пикселем', () => {
        const {result} = renderHook(() => useMedia('(width > 540px)'));

        expect(result.current).toBe(false);

        flip('(width > 540px)', true);
        expect(result.current).toBe(true);

        flip('(width > 540px)', false);
        expect(result.current).toBe(false);
    });

    it('разные запросы не мешают друг другу', () => {
        const {result} = renderHook(() => ({
            wide: useMedia('(width > 540px)'),
            finger: useMedia('(pointer: coarse)'),
        }));

        flip('(pointer: coarse)', true);

        expect(result.current).toEqual({wide: false, finger: true});
    });

    /*
     * Главное, ради чего subscribe кешируется по тексту запроса: иначе
     * каждый рендер отдавал бы useSyncExternalStore новую функцию,
     * и слушатель перевешивался бы без всякой нужды.
     */
    it('перерисовка не перевешивает слушателя', () => {
        const {rerender} = renderHook(() => useMedia('(width > 540px)'));

        expect(subscriptions).toBe(1);

        rerender();
        rerender();
        rerender();

        expect(subscriptions).toBe(1);
    });

    it('после размонтирования слушателя не остаётся', () => {
        const {unmount} = renderHook(() => useMedia('(width > 540px)'));

        expect(subscriptions).toBe(1);

        unmount();

        expect(subscriptions).toBe(0);
        expect(lists.get('(width > 540px)')!.listeners.size).toBe(0);
    });

    /*
     * Ответ читается у движка на каждый рендер, а не хранится копией:
     * копия разошлась бы с правдой при параллельной отрисовке.
     */
    it('ответ берётся у движка, а не из своей памяти', () => {
        const {rerender} = renderHook(() => useMedia('(width > 540px)'));
        const before = made;

        rerender();

        expect(made).toBeGreaterThan(before);
    });
});
