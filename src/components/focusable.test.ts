import {describe, expect, it} from 'vitest';
import {FOCUSABLE, isFocusable} from './focusable.ts';

/*
 * Список собран замером в Chromium 141 — таблица «кнопка → Tab → элемент»
 * лежит в шапке focusable.ts. Здесь она закреплена: разметка та же, ответ
 * тот же. Настоящая остановка Tab в jsdom не проверяется, там нет раскладки;
 * проверяется, что селектор отвечает так же, как ответил браузер.
 */

const YES: Array<[string, string]> = [
    ['ссылка с адресом', '<a href="/x" id="probe">ссылка</a>'],
    ['кнопка', '<button id="probe">кнопка</button>'],
    ['поле', '<input id="probe">'],
    ['поле только для чтения', '<input id="probe" readonly>'],
    ['список', '<select id="probe"><option>раз</option></select>'],
    ['многострочное поле', '<textarea id="probe"></textarea>'],
    ['summary', '<details><summary id="probe">итог</summary>тело</details>'],
    ['details без summary', '<details id="probe">тело</details>'],
    ['tabindex="0"', '<div id="probe" tabindex="0">блок</div>'],
    ['правимый текст', '<div id="probe" contenteditable>правка</div>'],
    ['звук с пультом', '<audio id="probe" controls></audio>'],
    ['видео с пультом', '<video id="probe" controls></video>'],
    ['встроенная рамка', '<iframe id="probe" title="рамка"></iframe>'],
];

const NO: Array<[string, string]> = [
    ['ссылка без адреса', '<a id="probe">не ссылка</a>'],
    ['выключенная кнопка', '<button id="probe" disabled>кнопка</button>'],
    ['выключенное поле', '<input id="probe" disabled>'],
    ['скрытое поле', '<input id="probe" type="hidden">'],
    ['tabindex="-1"', '<div id="probe" tabindex="-1">блок</div>'],
    ['contenteditable="false"', '<div id="probe" contenteditable="false">нет</div>'],
    ['обычный блок', '<div id="probe">блок</div>'],
    ['подпись', '<label id="probe">подпись</label>'],
];

function probe(html: string) {
    document.body.innerHTML = html;

    return document.getElementById('probe')!;
}

describe('focusable: что принимает фокус', () => {
    it.each(YES)('%s — принимает', (_name, html) => {
        expect(probe(html).matches(FOCUSABLE)).toBe(true);
    });

    it.each(NO)('%s — не принимает', (_name, html) => {
        expect(probe(html).matches(FOCUSABLE)).toBe(false);
    });

    /*
     * inert выключает всё поддерево, а не только сам элемент. Замерено
     * в Chromium 141: кнопка внутри [inert] остановкой Tab не становится.
     */
    it('inert выключает и сам узел, и всё под ним', () => {
        const node = probe('<div inert><button id="probe">кнопка</button></div>');

        expect(node.matches(FOCUSABLE)).toBe(false);
        expect(document.querySelector(FOCUSABLE)).toBeNull();
    });

    it('годится и для поиска внутри, а не только для сверки узла', () => {
        document.body.innerHTML = '<div id="box"><p>текст</p><a href="/x">ссылка</a></div>';

        expect(document.getElementById('box')!.querySelector(FOCUSABLE)).not.toBeNull();

        document.body.innerHTML = '<div id="box"><p>только текст</p></div>';

        expect(document.getElementById('box')!.querySelector(FOCUSABLE)).toBeNull();
    });
});

describe('focusable: isFocusable спрашивает и о видимости', () => {
    it('видимая кнопка годится', () => {
        expect(isFocusable(probe('<button id="probe">кнопка</button>'))).toBe(true);
    });

    it('негодный по селектору не спасается видимостью', () => {
        expect(isFocusable(probe('<div id="probe">блок</div>'))).toBe(false);
    });

    /*
     * Скрытый элемент фокус не примет, и попытка увести его туда оставила
     * бы фокус на body. Раскладки в jsdom нет, поэтому ответ движка
     * подменяется здесь напрямую — проверяется, что его вообще спрашивают.
     */
    it('скрытый по мнению движка не годится', () => {
        const node = probe('<button id="probe">кнопка</button>');

        node.checkVisibility = () => false;
        expect(isFocusable(node)).toBe(false);

        node.checkVisibility = () => true;
        expect(isFocusable(node)).toBe(true);
    });

    it('там, где checkVisibility нет вовсе, элемент считается видимым', () => {
        const node = probe('<button id="probe">кнопка</button>');

        (node as {checkVisibility?: unknown}).checkVisibility = undefined;
        expect(isFocusable(node)).toBe(true);
    });
});
