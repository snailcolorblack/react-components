import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {describe, expect, it, vi} from 'vitest';
import {JsonViewer} from './JsonViewer';

/*
 * Разметка, раскрытие, запятые и типы. Чего здесь нет: вида — свёрнутый
 * и раскрытый узел различаются правилами по details[open], а их в jsdom
 * не применить.
 */

const ДАННЫЕ = {
    имя: 'Рубль',
    код: 643,
    активна: true,
    списана: null,
    курс: {покупка: 1.1, продажа: 1.2},
    страны: ['RU', 'KZ'],
};

/** Текст дерева без кнопок. */
function дерево() {
    return document.querySelector('pre')!.textContent;
}

describe('JsonViewer: разметка', () => {
    it('объект и массив сворачиваются нативным details', () => {
        const {container} = render(<JsonViewer value={ДАННЫЕ} defaultDepth={0}/>);

        expect(container.querySelector('details')).not.toBeNull();
        expect(container.querySelector('summary')).not.toBeNull();
    });

    it('простые значения помечены типом', () => {
        const {container} = render(<JsonViewer value={ДАННЫЕ} defaultDepth={1}/>);
        const типы = [...container.querySelectorAll('[data-type]')].map(node => node.getAttribute('data-type'));

        expect(типы).toContain('string');
        expect(типы).toContain('number');
        expect(типы).toContain('boolean');
        /* null — не объект: typeof врёт, а показывать его надо отдельно. */
        expect(типы).toContain('null');
    });

    it('строки показаны в кавычках, остальное — как есть', () => {
        render(<JsonViewer value={{s: 'текст', n: 1, b: false, z: null}} defaultDepth={1}/>);

        expect(дерево()).toContain('"текст"');
        expect(дерево()).toContain('1');
        expect(дерево()).toContain('false');
        expect(дерево()).toContain('null');
    });

    it('у элементов массива ключей нет: там номера, а не имена', () => {
        render(<JsonViewer value={{страны: ['RU', 'KZ']}} defaultDepth={Infinity}/>);

        expect(дерево()).toContain('"RU"');
        expect(дерево()).not.toContain('"0"');
    });
});

describe('JsonViewer: запятые', () => {
    /*
     * Запятая — разметка, а не ::after: так она попадает в выделение
     * и в копию, и из просмотра можно вставить кусок как JSON.
     */

    it('ставится между элементами и не ставится после последнего', () => {
        render(<JsonViewer value={{a: 1, b: 2}} defaultDepth={Infinity}/>);
        const текст = дерево()!.replace(/\s+/g, ' ');

        expect(текст).toContain('"a": 1,');
        expect(текст).toContain('"b": 2');
        expect(текст.trimEnd().endsWith(',')).toBe(false);
    });

    it('после закрывающей скобки вложенного узла она тоже есть', () => {
        render(<JsonViewer value={{курс: {a: 1}, хвост: 2}} defaultDepth={Infinity}/>);
        const текст = дерево()!.replace(/\s+/g, ' ');

        expect(текст).toContain('},');
    });

    it('у свёрнутого узла запятая стоит после его скобки', () => {
        render(<JsonViewer value={{курс: {a: 1}, хвост: 2}} defaultDepth={0}/>);
        const текст = дерево()!.replace(/\s+/g, ' ');

        expect(текст).toContain('}');
    });
});

describe('JsonViewer: раскрытие', () => {
    it('defaultDepth решает, что раскрыто сразу', () => {
        /*
         * Проп начальный, как defaultValue у поля: действует при первой
         * отрисовке, а дальше деревом распоряжается человек. Поэтому два
         * отдельных просмотра, а не rerender одного.
         */
        const {container, unmount} = render(<JsonViewer value={ДАННЫЕ} defaultDepth={0}/>);
        expect(container.querySelector('details')?.open).toBe(false);
        unmount();

        const второй = render(<JsonViewer value={ДАННЫЕ} defaultDepth={1}/>);
        expect(второй.container.querySelector('details')?.open).toBe(true);
    });

    it('содержимое закрытой ветки не рисуется вовсе', () => {
        render(<JsonViewer value={ДАННЫЕ} defaultDepth={0}/>);

        /* Внутренности в разметку не попали: у <details> они остались бы
           там скрытыми, и большое дерево платило бы за каждый узел. */
        expect(дерево()).not.toContain('Рубль');
    });

    it('lazy={false} рисует и закрытое: тогда его находит поиск по странице', () => {
        /*
         * Замерено в Chromium: window.find в закрытом <details> находит
         * текст, если он есть в разметке, и не находит, если ветка
         * не отрисована вовсе.
         */
        render(<JsonViewer value={ДАННЫЕ} defaultDepth={0} lazy={false}/>);

        expect(дерево()).toContain('Рубль');
    });

    it('раскрытие показывает содержимое', async () => {
        const user = userEvent.setup();
        const {container} = render(<JsonViewer value={ДАННЫЕ} defaultDepth={0}/>);

        await user.click(container.querySelector('summary')!);

        expect(дерево()).toContain('Рубль');
    });

    it('у свёрнутого узла виден счётчик', () => {
        render(<JsonViewer value={ДАННЫЕ} defaultDepth={0}/>);

        expect(дерево()).toContain('6 полей');
    });

    it('счётчик массива считает штуки, а не поля', () => {
        render(<JsonViewer value={{страны: ['RU', 'KZ']}} defaultDepth={1}/>);

        expect(дерево()).toContain('2 шт.');
    });

    it('счётчик заменяется своим', () => {
        render(<JsonViewer value={ДАННЫЕ} defaultDepth={0} count={length => `${length} internals`}/>);

        expect(дерево()).toContain('6 internals');
    });

    it('«раскрыть всё» и «свернуть всё» работают на всё дерево', async () => {
        const user = userEvent.setup();
        const {container} = render(<JsonViewer value={ДАННЫЕ} defaultDepth={0}/>);

        await user.click(screen.getByRole('button', {name: 'Раскрыть всё'}));
        expect(дерево()).toContain('покупка');

        await user.click(screen.getByRole('button', {name: 'Свернуть всё'}));
        expect(container.querySelector('details')?.open).toBe(false);
        expect(дерево()).not.toContain('покупка');
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
        render(<JsonViewer value={ДАННЫЕ} toolbar={false}/>);

        expect(screen.queryByRole('button')).toBeNull();
    });

    it('подписи кнопок меняются', () => {
        render(<JsonViewer value={ДАННЫЕ} labels={{expand: 'Expand all'}}/>);

        expect(screen.getByRole('button', {name: 'Expand all'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Свернуть всё'})).toBeInTheDocument();
    });

    it('пустые объект и массив не сворачиваются: раскрывать в них нечего', () => {
        const {container} = render(<JsonViewer value={{пусто: {}, тоже: []}} defaultDepth={Infinity}/>);

        expect(дерево()).toContain('{}');
        expect(дерево()).toContain('[]');
        /* Один details — корневой; у пустых узлов своего нет. */
        expect(container.querySelectorAll('details')).toHaveLength(1);
    });

    it('простое значение в корне тоже показывается', () => {
        render(<JsonViewer value={42} toolbar={false}/>);

        expect(дерево()).toContain('42');
    });

    it('свой класс не вытесняет собственный', () => {
        const {container} = render(<JsonViewer value={ДАННЫЕ} className="мой"/>);
        const node = container.firstElementChild as HTMLElement;

        expect(node.className).toContain('мой');
        expect(node.className.split(' ').length).toBeGreaterThan(1);
    });

    it('у каждого узла своё состояние: соседи его не перехватывают', async () => {
        const user = userEvent.setup();
        const {container} = render(
            <JsonViewer value={{a: {b: 1}, e: {f: 2}}} defaultDepth={1} toolbar={false}/>,
        );

        const ветки = () => [...container.querySelectorAll<HTMLDetailsElement>('details details')];

        /* Раскрываем вторую ветку — первая обязана остаться закрытой. */
        await user.click(ветки()[1].querySelector('summary')!);

        expect(ветки()[0].open).toBe(false);
        expect(ветки()[1].open).toBe(true);
        expect(дерево()).toContain('2');
        expect(дерево()).not.toContain('"b"');
    });

    it('проходит axe', async () => {
        const {container} = render(<JsonViewer value={ДАННЫЕ} defaultDepth={Infinity}/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<JsonViewer value={ДАННЫЕ} defaultDepth={Infinity}/>);

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
    ])('%i → %s', (сколько, ожидание) => {
        const значение = Object.fromEntries(
            Array.from({length: сколько}, (_, index) => [`к${index}`, index]),
        );
        const {unmount} = render(<JsonViewer value={значение} defaultDepth={0}/>);

        expect(дерево()).toContain(ожидание);
        unmount();
    });
});
