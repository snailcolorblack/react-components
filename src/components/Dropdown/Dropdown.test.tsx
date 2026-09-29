import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {Profiler} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Dropdown} from './Dropdown';
import type {DropdownItem} from './Dropdown.interface.ts';

/*
 * Здесь — разметка, роли, клавиатура и выбор пунктов. Геометрии нет:
 * привязку к кнопке и переворот у края экрана считает движок, jsdom
 * этого не умеет. Esc, клик мимо и возврат фокуса на триггер — тоже
 * работа браузера, заглушка в setup.ts их намеренно не подделывает.
 */

function menu() {
    return screen.getByRole('menu', {hidden: true});
}

function isOpen() {
    return menu().matches(':popover-open');
}

function setup(items: DropdownItem[] = ITEMS) {
    const user = userEvent.setup();
    render(<Dropdown id="m" trigger="Действия" items={items}/>);

    return {user, trigger: screen.getByRole('button', {name: 'Действия'})};
}

const ITEMS: DropdownItem[] = [
    {label: 'Копировать'},
    {label: 'Переименовать'},
    {label: 'Открыть', href: '#open'},
    {label: 'Удалить', danger: true, separator: 'before'},
];

describe('Dropdown', () => {
    it('триггер связан с меню и объявляет его', () => {
        const {trigger} = setup();
        expect(trigger).toHaveAttribute('popovertarget', 'm');
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
        expect(menu()).toHaveAttribute('popover', 'auto');
        // имя меню — подпись триггера, без дублирования текста
        expect(menu()).toHaveAttribute('aria-labelledby', trigger.id);
    });

    it('пункты: кнопки, ссылки и разделитель с верными ролями', () => {
        setup();
        const items = screen.getAllByRole('menuitem', {hidden: true});
        expect(items.map(item => item.tagName)).toEqual(['BUTTON', 'BUTTON', 'A', 'BUTTON']);
        expect(items[2]).toHaveAttribute('href', '#open');
        expect(screen.getByRole('separator', {hidden: true})).toBeInTheDocument();
        // все вне табуляции: меню — один шаг Tab
        items.forEach(item => expect(item).toHaveAttribute('tabindex', '-1'));
    });

    it('клик мышью открывает меню, фокус на меню, ни один пункт не выбран', async () => {
        const {user, trigger} = setup();
        await user.click(trigger);
        expect(isOpen()).toBe(true);
        expect(menu()).toHaveFocus();
    });

    it('после открытия мышью стрелки начинают с края', async () => {
        const {user, trigger} = setup();
        await user.click(trigger);
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', {name: 'Копировать'})).toHaveFocus();

        await user.click(trigger);
        await user.click(trigger);
        await user.keyboard('{ArrowUp}');
        expect(screen.getByRole('menuitem', {name: 'Удалить'})).toHaveFocus();
    });

    it.each(['{Enter}', ' '])('%s на триггере открывает с фокусом на первом пункте', async key => {
        const {user, trigger} = setup();
        trigger.focus();
        await user.keyboard(key);
        expect(isOpen()).toBe(true);
        expect(screen.getByRole('menuitem', {name: 'Копировать'})).toHaveFocus();
    });

    it('меню фокусируемо программно, но не по Tab', () => {
        setup();
        expect(menu()).toHaveAttribute('tabindex', '-1');
    });

    it('стрелки ходят по кругу, Home и End — к краям', async () => {
        const {user, trigger} = setup();
        trigger.focus();
        await user.keyboard('{Enter}');
        const item = (name: string) => screen.getByRole('menuitem', {name});

        await user.keyboard('{ArrowUp}');
        expect(item('Удалить')).toHaveFocus();
        await user.keyboard('{ArrowDown}');
        expect(item('Копировать')).toHaveFocus();
        await user.keyboard('{End}');
        expect(item('Удалить')).toHaveFocus();
        await user.keyboard('{Home}');
        expect(item('Копировать')).toHaveFocus();
    });

    it('выбор пункта вызывает onSelect и закрывает меню', async () => {
        const onSelect = vi.fn();
        const {user, trigger} = setup([{label: 'Сохранить', onSelect}]);
        trigger.focus();
        await user.keyboard('{Enter}');
        await user.keyboard('{Enter}');
        expect(onSelect).toHaveBeenCalledOnce();
        expect(isOpen()).toBe(false);
    });

    it('preventDefault в onSelect оставляет меню открытым', async () => {
        const {user, trigger} = setup([{label: 'Ещё', onSelect: event => event.preventDefault()}]);
        await user.click(trigger);
        await user.click(screen.getByRole('menuitem', {name: 'Ещё'}));
        expect(isOpen()).toBe(true);
    });

    it('недоступный пункт достижим, но не срабатывает', async () => {
        const onSelect = vi.fn();
        const {user, trigger} = setup([{label: 'Первый'}, {label: 'Архив', disabled: true, onSelect}]);
        await user.click(trigger);
        await user.keyboard('{ArrowDown}{ArrowDown}');

        const archived = screen.getByRole('menuitem', {name: 'Архив'});
        expect(archived).toHaveFocus();
        expect(archived).toHaveAttribute('aria-disabled', 'true');
        // не disabled: иначе пункт выпал бы из навигации стрелками
        expect(archived).not.toBeDisabled();

        await user.keyboard('{Enter}');
        expect(onSelect).not.toHaveBeenCalled();
        expect(isOpen()).toBe(true);
    });

    it('Tab закрывает меню', async () => {
        const {user, trigger} = setup();
        await user.click(trigger);
        await user.tab();
        expect(isOpen()).toBe(false);
    });

    it('иконки по обе стороны подписи декоративны и не попадают в имя', () => {
        setup([{label: 'Копировать', iconStart: <svg data-testid="start"/>, iconEnd: <svg data-testid="end"/>}]);
        const item = screen.getByRole('menuitem', {name: 'Копировать', hidden: true});
        const start = screen.getByTestId('start').parentElement!;
        const end = screen.getByTestId('end').parentElement!;

        expect(start).toHaveAttribute('aria-hidden', 'true');
        expect(end).toHaveAttribute('aria-hidden', 'true');
        // порядок в разметке: иконка, подпись, иконка
        expect(item.firstElementChild).toBe(start);
        expect(item.lastElementChild).toBe(end);
    });

    it('собственные обработчики триггера не теряются', async () => {
        const onKeyDown = vi.fn();
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<Dropdown trigger="Меню" items={ITEMS} triggerProps={{onClick, onKeyDown, variant: 'OUTLINE'}}/>);
        screen.getByRole('button', {name: 'Меню'}).focus();
        await user.keyboard('{Enter}');
        expect(onKeyDown).toHaveBeenCalled();
        expect(onClick).toHaveBeenCalledOnce();
        expect(isOpen()).toBe(true);
    });

    it('свой триггер дочерним элементом заменяет встроенный', async () => {
        const onClick = vi.fn();
        const onKeyDown = vi.fn();
        const user = userEvent.setup();
        render(
            <Dropdown items={ITEMS}>
                <button id="own" style={{color: 'red'}} onClick={onClick} onKeyDown={onKeyDown}>
                    <svg aria-hidden="true"/> Ещё
                </button>
            </Dropdown>,
        );
        const trigger = screen.getByRole('button', {name: 'Ещё'});
        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
        expect(trigger).toHaveAttribute('popovertarget', menu().id);
        // свой id сохраняется и становится именем меню
        expect(menu()).toHaveAttribute('aria-labelledby', 'own');
        // свой style не трогается
        expect(trigger.style.color).toBe('red');

        await user.click(trigger);
        expect(onClick).toHaveBeenCalledOnce();
        expect(isOpen()).toBe(true);

        trigger.focus();
        await user.keyboard('{Enter}');
        expect(onKeyDown).toHaveBeenCalled();
    });

    it('className и style пункта доходят до разметки', () => {
        setup([
            {label: 'Один', className: 'own-item', style: {fontWeight: 600}},
            {label: 'Два'},
        ]);
        const item = screen.getByRole('menuitem', {name: 'Один', hidden: true});
        expect(item).toHaveClass('own-item');
        expect(item.style.fontWeight).toBe('600');
        // свой класс модуля на месте
        expect(item.classList.length).toBeGreaterThan(1);
    });

    it('separator рисует линию с нужной стороны пункта', () => {
        setup([
            {label: 'Один', separator: 'after'},
            {label: 'Два'},
            {label: 'Три', separator: 'before'},
        ]);
        const order = Array.from(menu().children).map(node =>
            node.getAttribute('role') === 'separator' ? '—' : node.textContent);
        expect(order).toEqual(['Один', '—', 'Два', '—', 'Три']);
    });

    it('линия не мешает навигации стрелками', async () => {
        const {user, trigger} = setup([{label: 'Один'}, {label: 'Два', separator: 'before'}]);
        trigger.focus();
        await user.keyboard('{Enter}{ArrowDown}');
        expect(screen.getByRole('menuitem', {name: 'Два'})).toHaveFocus();
    });

    it('свой aria-label меню заменяет связь с триггером', () => {
        render(<Dropdown trigger="…" aria-label="Действия с файлом" items={ITEMS}/>);
        expect(menu()).toHaveAttribute('aria-label', 'Действия с файлом');
        expect(menu()).not.toHaveAttribute('aria-labelledby');
    });

    it('якорь не задаётся вручную — его ставит браузер по popovertarget', () => {
        const {trigger} = setup();
        // пустая переменная оставляет в CSS position-anchor: auto — неявный якорь
        expect(menu().style.getPropertyValue('--popover-anchor')).toBe('');
        expect(trigger).not.toHaveAttribute('style');
    });

    it('стрелки на закрытом триггере ничего не делают', async () => {
        const {user, trigger} = setup();
        trigger.focus();
        await user.keyboard('{ArrowDown}');
        expect(isOpen()).toBe(false);
        expect(trigger).toHaveFocus();
    });

    /* ---------------------------------------------------------------- */
    /*  Оптимизация                                                     */
    /* ---------------------------------------------------------------- */

    it('открытие, навигация и выбор не вызывают перерисовок', async () => {
        const onRender = vi.fn();
        const user = userEvent.setup();
        render(
            <Profiler id="dropdown" onRender={onRender}>
                <Dropdown trigger="Действия" items={ITEMS}/>
            </Profiler>,
        );
        const initial = onRender.mock.calls.length;

        await user.click(screen.getByRole('button', {name: 'Действия'}));
        await user.keyboard('{ArrowDown}{End}{Enter}');

        expect(isOpen()).toBe(false);
        expect(onRender).toHaveBeenCalledTimes(initial);
    });

    /* ---------------------------------------------------------------- */
    /*  Доступность                                                     */
    /* ---------------------------------------------------------------- */

    it('открытое меню проходит axe', async () => {
        const user = userEvent.setup();
        const {container} = render(
            <Dropdown trigger="Действия" items={[...ITEMS, {label: 'Архив', disabled: true}]}/>,
        );
        await user.click(screen.getByRole('button', {name: 'Действия'}));
        expect(isOpen()).toBe(true);

        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Dropdown trigger="Меню" items={ITEMS} placement="inline-end"/>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
