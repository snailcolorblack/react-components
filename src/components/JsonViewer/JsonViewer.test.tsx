import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {JsonViewer} from './JsonViewer';

/*
 * Разметка, раскрытие, запятые и типы. Чего здесь нет: вида — свёрнутый
 * и раскрытый узел различаются правилами по details[open], а их в jsdom
 * не применить.
 */

const DATA = {
    name: 'Рубль',
    code: 643,
    active: true,
    closedAt: null,
    rate: {buy: 1.1, sell: 1.2},
    countries: ['RU', 'KZ'],
};

/** Текст дерева без кнопок. */
function tree() {
    return document.querySelector('pre')!.textContent;
}

describe('JsonViewer: разметка', () => {
    it('объект и массив сворачиваются нативным details', () => {
        const {container} = render(<JsonViewer value={DATA} defaultDepth={0}/>);

        expect(container.querySelector('details')).not.toBeNull();
        expect(container.querySelector('summary')).not.toBeNull();
    });

    it('простые значения помечены типом', () => {
        const {container} = render(<JsonViewer value={DATA} defaultDepth={1}/>);
        const kinds = [...container.querySelectorAll('[data-type]')].map(node => node.getAttribute('data-type'));

        expect(kinds).toContain('string');
        expect(kinds).toContain('number');
        expect(kinds).toContain('boolean');
        /* null — не объект: typeof врёт, а показывать его надо отдельно. */
        expect(kinds).toContain('null');
    });

    it('строки показаны в кавычках, остальное — как есть', () => {
        render(<JsonViewer value={{s: 'текст', n: 1, b: false, z: null}} defaultDepth={1}/>);

        expect(tree()).toContain('"текст"');
        expect(tree()).toContain('1');
        expect(tree()).toContain('false');
        expect(tree()).toContain('null');
    });

    it('у элементов массива ключей нет: там номера, а не имена', () => {
        render(<JsonViewer value={{countries: ['RU', 'KZ']}} defaultDepth={Infinity}/>);

        expect(tree()).toContain('"RU"');
        expect(tree()).not.toContain('"0"');
    });
});

describe('JsonViewer: запятые', () => {
    /*
     * Запятая — разметка, а не ::after: так она попадает в выделение
     * и в копию, и из просмотра можно вставить кусок как JSON.
     */

    it('ставится между элементами и не ставится после последнего', () => {
        render(<JsonViewer value={{a: 1, b: 2}} defaultDepth={Infinity}/>);
        const text = tree()!.replace(/\s+/g, ' ');

        expect(text).toContain('"a": 1,');
        expect(text).toContain('"b": 2');
        expect(text.trimEnd().endsWith(',')).toBe(false);
    });

    it('после закрывающей скобки вложенного узла она тоже есть', () => {
        render(<JsonViewer value={{rate: {a: 1}, tail: 2}} defaultDepth={Infinity}/>);
        const text = tree()!.replace(/\s+/g, ' ');

        expect(text).toContain('},');
    });

    it('у свёрнутого узла запятая стоит после его скобки', () => {
        render(<JsonViewer value={{rate: {a: 1}, tail: 2}} defaultDepth={0}/>);
        const text = tree()!.replace(/\s+/g, ' ');

        expect(text).toContain('}');
    });
});

describe('JsonViewer: раскрытие', () => {
    it('defaultDepth решает, что раскрыто сразу', () => {
        /*
         * Проп начальный, как defaultValue у поля: действует при первой
         * отрисовке, а дальше деревом распоряжается человек. Поэтому два
         * отдельных просмотра, а не rerender одного.
         */
        const {container, unmount} = render(<JsonViewer value={DATA} defaultDepth={0}/>);
        expect(container.querySelector('details')?.open).toBe(false);
        unmount();

        const second = render(<JsonViewer value={DATA} defaultDepth={1}/>);
        expect(second.container.querySelector('details')?.open).toBe(true);
    });

    it('содержимое закрытой ветки не рисуется вовсе', () => {
        render(<JsonViewer value={DATA} defaultDepth={0}/>);

        /* Внутренности в разметку не попали: у <details> они остались бы
           там скрытыми, и большое дерево платило бы за каждый узел. */
        expect(tree()).not.toContain('Рубль');
    });

    it('lazy={false} рисует и закрытое: тогда его находит поиск по странице', () => {
        /*
         * Замерено в Chromium: window.find в закрытом <details> находит
         * текст, если он есть в разметке, и не находит, если ветка
         * не отрисована вовсе.
         */
        render(<JsonViewer value={DATA} defaultDepth={0} lazy={false}/>);

        expect(tree()).toContain('Рубль');
    });

    it('раскрытие показывает содержимое', async () => {
        const user = userEvent.setup();
        const {container} = render(<JsonViewer value={DATA} defaultDepth={0}/>);

        await user.click(container.querySelector('summary')!);

        expect(tree()).toContain('Рубль');
    });

    it('у свёрнутого узла виден счётчик', () => {
        render(<JsonViewer value={DATA} defaultDepth={0}/>);

        expect(tree()).toContain('6 полей');
    });

    it('счётчик массива считает штуки, а не поля', () => {
        render(<JsonViewer value={{countries: ['RU', 'KZ']}} defaultDepth={1}/>);

        expect(tree()).toContain('2 шт.');
    });

    it('счётчик заменяется своим', () => {
        render(<JsonViewer value={DATA} defaultDepth={0} count={length => `${length} internals`}/>);

        expect(tree()).toContain('6 internals');
    });

    it('«раскрыть всё» и «свернуть всё» работают на всё дерево', async () => {
        const user = userEvent.setup();
        const {container} = render(<JsonViewer value={DATA} defaultDepth={0}/>);

        await user.click(screen.getByRole('button', {name: 'Раскрыть всё'}));
        expect(tree()).toContain('buy');

        await user.click(screen.getByRole('button', {name: 'Свернуть всё'}));
        expect(container.querySelector('details')?.open).toBe(false);
        expect(tree()).not.toContain('buy');
    });
});

describe('JsonViewer: копирование', () => {
    it('кладёт в буфер весь JSON, а не разметку', async () => {
        const user = userEvent.setup();
        const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
        render(<JsonViewer value={{a: 1}}/>);

        await user.click(screen.getByRole('button', {name: 'Копировать'}));

        expect(writeText).toHaveBeenCalledWith(JSON.stringify({a: 1}, null, 4));
        writeText.mockRestore();
    });

    it('запрет на буфер не роняет просмотр', async () => {
        const user = userEvent.setup();
        const writeText = vi.spyOn(navigator.clipboard, 'writeText')
            .mockRejectedValue(new Error('буфер запрещён'));
        render(<JsonViewer value={{a: 1}}/>);

        await user.click(screen.getByRole('button', {name: 'Копировать'}));

        expect(screen.getByRole('button', {name: 'Копировать'})).toBeInTheDocument();
        writeText.mockRestore();
    });
});

describe('JsonViewer: разное', () => {
    it('кнопки убираются пропом', () => {
        render(<JsonViewer value={DATA} toolbar={false}/>);

        expect(screen.queryByRole('button')).toBeNull();
    });

    it('подписи кнопок меняются', () => {
        render(<JsonViewer value={DATA} labels={{expand: 'Expand all'}}/>);

        expect(screen.getByRole('button', {name: 'Expand all'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Свернуть всё'})).toBeInTheDocument();
    });

    it('пустые объект и массив не сворачиваются: раскрывать в них нечего', () => {
        const {container} = render(<JsonViewer value={{empty: {}, also: []}} defaultDepth={Infinity}/>);

        expect(tree()).toContain('{}');
        expect(tree()).toContain('[]');
        /* Один details — корневой; у пустых узлов своего нет. */
        expect(container.querySelectorAll('details')).toHaveLength(1);
    });

    it('простое значение в корне тоже показывается', () => {
        render(<JsonViewer value={42} toolbar={false}/>);

        expect(tree()).toContain('42');
    });

    it('свой класс не вытесняет собственный', () => {
        const {container} = render(<JsonViewer value={DATA} className="мой"/>);
        const node = container.firstElementChild as HTMLElement;

        expect(node.className).toContain('мой');
        expect(node.className.split(' ').length).toBeGreaterThan(1);
    });

    it('у каждого узла своё состояние: соседи его не перехватывают', async () => {
        const user = userEvent.setup();
        const {container} = render(
            <JsonViewer value={{a: {b: 1}, e: {f: 2}}} defaultDepth={1} toolbar={false}/>,
        );

        const branches = () => [...container.querySelectorAll<HTMLDetailsElement>('details details')];

        /* Раскрываем вторую ветку — первая обязана остаться закрытой. */
        await user.click(branches()[1].querySelector('summary')!);

        expect(branches()[0].open).toBe(false);
        expect(branches()[1].open).toBe(true);
        expect(tree()).toContain('2');
        expect(tree()).not.toContain('"b"');
    });

    it('проходит axe', async () => {
        const {container} = render(<JsonViewer value={DATA} defaultDepth={Infinity}/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<JsonViewer value={DATA} defaultDepth={Infinity}/>);

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});

describe('JsonViewer: счётчик по-русски', () => {
    /* 1 поле, 2…4 поля, 5…20 полей — и второй десяток особняком. */
    it.each([
        [1, '1 поле'],
        [3, '3 поля'],
        [5, '5 полей'],
        [11, '11 полей'],
        [12, '12 полей'],
        [21, '21 поле'],
        [22, '22 поля'],
    ])('%i → %s', (count, expected) => {
        const value = Object.fromEntries(
            Array.from({length: count}, (_, index) => [`к${index}`, index]),
        );
        const {unmount} = render(<JsonViewer value={value} defaultDepth={0}/>);

        expect(tree()).toContain(expected);
        unmount();
    });
});
