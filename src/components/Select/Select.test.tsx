import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Select} from './Select';

/*
 * Разметка, роли, форма и клавиатура. Геометрии нет: плавающая подпись,
 * стек области и привязка списка к полю через anchor positioning считаются
 * движком, которого в jsdom не существует, — их место в браузерных замерах.
 */

type Deposit = {value: number, name: string, visibleName: string, off?: boolean};

const DEPOSITS: Deposit[] = [
    {value: 1, name: 'safe', visibleName: 'Надёжный'},
    {value: 2, name: 'kids', visibleName: 'Детский'},
    {value: 3, name: 'save', visibleName: 'Накопительный', off: true},
];

const STRINGS = ['Надёжный', 'Детский', 'Накопительный'];

/** Открыть список: у обоих вариантов это одна и та же кнопка. */
async function openList() {
    await userEvent.click(screen.getByRole('combobox'));
}

describe('Select single', () => {
    it('триггер — кнопка-комбобокс, а не текстовое поле', () => {
        render(<Select label="Вид депозита" items={STRINGS}/>);
        const control = screen.getByRole('combobox', {name: 'Вид депозита'});
        expect(control.tagName).toBe('BUTTON');
        expect(control).toHaveAttribute('aria-haspopup', 'listbox');
        expect(control).toHaveAttribute('aria-expanded', 'false');
    });

    it('список не объявлен множественным', async () => {
        render(<Select label="Вид" items={STRINGS}/>);
        await openList();
        expect(screen.getByRole('listbox')).not.toHaveAttribute('aria-multiselectable');
    });

    it('массив строк не требует itemLabel и itemValue', async () => {
        render(<Select label="Вид" items={STRINGS}/>);
        await openList();
        const options = screen.getAllByRole('option');
        // пустого пункта нет: «не выбрано» держит состояние, а не разметка
        expect(options.map(option => option.textContent)).toEqual(STRINGS);
    });

    it('itemLabel и itemValue берут поля объекта', async () => {
        render(
            <form>
                <Select label="Вид" name="deposit" items={DEPOSITS} itemLabel="visibleName" itemValue="value"/>
            </form>,
        );
        await openList();
        expect(screen.getAllByRole('option')[0]).toHaveTextContent('Надёжный');

        await userEvent.click(screen.getByRole('option', {name: 'Надёжный'}));
        const form = document.querySelector('form') as HTMLFormElement;
        expect(new FormData(form).get('deposit')).toBe('1');
    });

    it('itemLabel и itemValue принимают функцию', async () => {
        const onChange = vi.fn();
        render(
            <Select
                label="Вид"
                items={DEPOSITS}
                itemLabel={item => `${item.visibleName} (${item.name})`}
                itemValue={item => `id-${item.value}`}
                onChange={onChange}
            />,
        );
        await openList();
        expect(screen.getAllByRole('option')[0]).toHaveTextContent('Надёжный (safe)');

        await userEvent.click(screen.getByRole('option', {name: 'Надёжный (safe)'}));
        expect(onChange).toHaveBeenCalledWith('id-1', DEPOSITS[0]);
    });

    it('itemDisabled выключает пункт', async () => {
        render(<Select label="Вид" items={DEPOSITS} itemLabel="visibleName" itemValue="value" itemDisabled="off"/>);
        await openList();
        const off = screen.getByRole('option', {name: 'Накопительный'});
        expect(off).toHaveAttribute('aria-disabled', 'true');

        await userEvent.click(off);
        expect(off).toHaveAttribute('aria-selected', 'false');
    });

    it('itemRender меняет разметку пункта', async () => {
        render(
            <Select
                label="Вид" items={DEPOSITS} itemValue="value"
                itemRender={item => <><span data-testid="icon">•</span>{item.visibleName}</>}
            />,
        );
        await openList();
        expect(screen.getAllByTestId('icon')).toHaveLength(3);
        expect(screen.getAllByRole('option')[0]).toHaveTextContent('Надёжный');
    });

    it('пустое значение по умолчанию: подпись работает как подсказка', async () => {
        render(<Select label="Вид" items={STRINGS}/>);
        await openList();
        screen.getAllByRole('option')
            .forEach(option => expect(option).toHaveAttribute('aria-selected', 'false'));
    });

    it('defaultValue выбирает пункт заранее', async () => {
        render(<Select label="Вид" items={DEPOSITS} itemLabel="visibleName" itemValue="value" defaultValue={2}/>);
        await openList();
        expect(screen.getByRole('option', {name: 'Детский'})).toHaveAttribute('aria-selected', 'true');
    });

    it('выбор закрывает список', async () => {
        render(<Select label="Вид" items={STRINGS}/>);
        await openList();
        await userEvent.click(screen.getByRole('option', {name: 'Надёжный'}));

        expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    });

    it('новый выбор заменяет прежний', async () => {
        render(<Select label="Вид" items={STRINGS}/>);
        await openList();
        await userEvent.click(screen.getByRole('option', {name: 'Надёжный'}));

        await openList();
        await userEvent.click(screen.getByRole('option', {name: 'Детский'}));

        // выбор закрыл список, поэтому для проверки открываем его снова
        await openList();
        expect(screen.getByRole('option', {name: 'Надёжный'})).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('option', {name: 'Детский'})).toHaveAttribute('aria-selected', 'true');
    });

    it('onChange отдаёт значение и сам элемент', async () => {
        const onChange = vi.fn();
        render(
            <Select label="Вид" items={DEPOSITS} itemLabel="visibleName" itemValue="value" onChange={onChange}/>,
        );

        await openList();
        await userEvent.click(screen.getByRole('option', {name: 'Детский'}));
        expect(onChange).toHaveBeenCalledWith('2', DEPOSITS[1]);
    });

    it('значение уходит в форму по name', async () => {
        render(
            <form>
                <Select label="Вид" name="deposit" items={DEPOSITS} itemLabel="visibleName" itemValue="value"/>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;
        expect(new FormData(form).getAll('deposit')).toEqual([]);

        await openList();
        await userEvent.click(screen.getByRole('option', {name: 'Накопительный'}));
        expect(new FormData(form).getAll('deposit')).toEqual(['3']);
    });

    it('выбранное значение попадает в имя поля, подпись остаётся', async () => {
        render(<Select label="Вид депозита" items={STRINGS}/>);
        // имя приходит из aria-labelledby, значит подпись остаётся после выбора
        expect(screen.getByRole('combobox', {name: 'Вид депозита'})).toBeInTheDocument();

        await openList();
        await userEvent.click(screen.getByRole('option', {name: 'Детский'}));
        expect(screen.getByRole('combobox', {name: 'Вид депозита Детский'})).toBeInTheDocument();
    });

    it('стрелки и Home/End ходят по списку', async () => {
        render(<Select label="Вид" items={STRINGS}/>);
        await openList();
        const option = (name: string) => screen.getByRole('option', {name});

        expect(option('Надёжный')).toHaveFocus();
        await userEvent.keyboard('{ArrowDown}');
        expect(option('Детский')).toHaveFocus();
        await userEvent.keyboard('{End}');
        expect(option('Накопительный')).toHaveFocus();
        await userEvent.keyboard('{Home}');
        expect(option('Надёжный')).toHaveFocus();
    });

    it('проходит axe', async () => {
        const {container} = render(
            <Select label="Вид депозита" items={DEPOSITS} itemLabel="visibleName" itemValue="value"/>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });

    it('открытый список проходит axe', async () => {
        const {container} = render(
            <Select label="Вид депозита" items={DEPOSITS} itemLabel="visibleName" itemValue="value"/>,
        );
        await openList();
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });
});

describe('Select multi', () => {
    function open() {
        return screen.getByRole('listbox', {hidden: true});
    }

    it('триггер объявлен комбобоксом со списком', () => {
        render(<Select variant="multi" label="Валюты" items={STRINGS}/>);
        // в имени кнопки подпись плюс счётчик: чипсы читаются отдельно
        const trigger = screen.getByRole('combobox', {name: 'Валюты ничего не выбрано'});
        expect(trigger.tagName).toBe('BUTTON');
        expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
        expect(open()).toHaveAttribute('aria-multiselectable', 'true');
    });

    it('пункты — option с aria-selected', async () => {
        render(<Select variant="multi" label="Валюты" items={STRINGS}/>);
        await userEvent.click(screen.getByRole('combobox'));
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(3);
        options.forEach(option => expect(option).toHaveAttribute('aria-selected', 'false'));
    });

    it('выбирается несколько значений, список остаётся открытым', async () => {
        render(<Select variant="multi" label="Валюты" items={STRINGS}/>);
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(screen.getByRole('option', {name: 'Надёжный'}));
        await userEvent.click(screen.getByRole('option', {name: 'Детский'}));

        expect(screen.getByRole('option', {name: 'Надёжный'})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('option', {name: 'Детский'})).toHaveAttribute('aria-selected', 'true');
    });

    it('повторный выбор снимает значение', async () => {
        render(<Select variant="multi" label="Валюты" items={STRINGS}/>);
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(screen.getByRole('option', {name: 'Надёжный'}));
        await userEvent.click(screen.getByRole('option', {name: 'Надёжный'}));
        expect(screen.getByRole('option', {name: 'Надёжный'})).toHaveAttribute('aria-selected', 'false');
    });

    it('выбранное показано чипсами, крестик убирает значение', async () => {
        render(<Select variant="multi" label="Валюты" items={STRINGS}/>);
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(screen.getByRole('option', {name: 'Детский'}));

        const chip = screen.getByRole('button', {name: 'Убрать Детский'});
        expect(chip).toBeInTheDocument();

        await userEvent.click(chip);
        expect(screen.queryByRole('button', {name: 'Убрать Детский'})).toBeNull();
    });

    it('chipRender рисует чипс отдельно от пункта списка', async () => {
        render(
            <Select variant="multi" label="Валюты" items={DEPOSITS} itemValue="value" itemText="visibleName"
                    itemRender={item => <span data-testid="row">{item.visibleName} ({item.name})</span>}
                    chipRender={item => <span data-testid="chip">{item.name}</span>}/>,
        );
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(screen.getByRole('option', {name: 'Надёжный (safe)'}));

        expect(screen.getByTestId('chip')).toHaveTextContent('safe');
        expect(screen.getAllByTestId('row')).toHaveLength(3);
    });

    it('itemText даёт имя чипсу, когда подпись — разметка', async () => {
        render(
            <Select variant="multi" label="Валюты" items={DEPOSITS} itemValue="value" itemText="visibleName"
                    itemLabel={item => <><span aria-hidden="true">★</span>{' '}{item.visibleName}</>}/>,
        );
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(screen.getAllByRole('option')[0]);

        expect(screen.getByRole('button', {name: 'Убрать Надёжный'})).toBeInTheDocument();
    });

    it('без itemText имя чипса падает на значение, а не пустеет', async () => {
        render(
            <Select variant="multi" label="Валюты" items={DEPOSITS} itemValue="value"
                    itemLabel={item => <b>{item.visibleName}</b>}/>,
        );
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(screen.getAllByRole('option')[0]);

        // безымянной кнопка не остаётся: WCAG 4.1.2
        expect(screen.getByRole('button', {name: 'Убрать 1'})).toBeInTheDocument();
    });

    it('каждое значение уходит в форму отдельным полем', async () => {
        render(
            <form>
                <Select variant="multi" label="Валюты" name="currency" items={DEPOSITS}
                        itemLabel="visibleName" itemValue="value"/>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;

        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(screen.getByRole('option', {name: 'Надёжный'}));
        await userEvent.click(screen.getByRole('option', {name: 'Детский'}));

        // getAll, как у select multiple и группы флажков
        expect(new FormData(form).getAll('currency')).toEqual(['1', '2']);
    });

    it('стрелки и Home/End ходят по списку', async () => {
        render(<Select variant="multi" label="Валюты" items={STRINGS}/>);
        await userEvent.click(screen.getByRole('combobox'));
        const option = (name: string) => screen.getByRole('option', {name});

        expect(option('Надёжный')).toHaveFocus();
        await userEvent.keyboard('{ArrowDown}');
        expect(option('Детский')).toHaveFocus();
        await userEvent.keyboard('{End}');
        expect(option('Накопительный')).toHaveFocus();
        await userEvent.keyboard('{ArrowDown}');
        expect(option('Надёжный')).toHaveFocus();
        await userEvent.keyboard('{ArrowUp}');
        expect(option('Накопительный')).toHaveFocus();
        await userEvent.keyboard('{Home}');
        expect(option('Надёжный')).toHaveFocus();
    });

    it('пробел выбирает пункт с клавиатуры', async () => {
        render(<Select variant="multi" label="Валюты" items={STRINGS}/>);
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.keyboard(' ');
        expect(screen.getByRole('option', {name: 'Надёжный'})).toHaveAttribute('aria-selected', 'true');
    });

    it('недоступный пункт не выбирается', async () => {
        render(
            <Select variant="multi" label="Вид" items={DEPOSITS}
                    itemLabel="visibleName" itemValue="value" itemDisabled="off"/>,
        );
        await userEvent.click(screen.getByRole('combobox'));
        const off = screen.getByRole('option', {name: 'Накопительный'});
        expect(off).toHaveAttribute('aria-disabled', 'true');

        await userEvent.click(off);
        expect(off).toHaveAttribute('aria-selected', 'false');
    });

    it('управляемый режим: значение приходит снаружи', async () => {
        function Controlled() {
            const [value, setValue] = useState<string[]>([]);

            return (
                <>
                    <Select variant="multi" label="Валюты" items={STRINGS}
                            value={value} onChange={setValue}/>
                    <output>{value.join(',')}</output>
                </>
            );
        }

        render(<Controlled/>);
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(screen.getByRole('option', {name: 'Детский'}));
        expect(screen.getByRole('status')).toHaveTextContent('Детский');
    });

    it('defaultValue выбирает значения заранее', () => {
        render(
            <Select variant="multi" label="Вид" items={DEPOSITS}
                    itemLabel="visibleName" itemValue="value" defaultValue={[2]}/>,
        );
        expect(screen.getByRole('button', {name: 'Убрать Детский'})).toBeInTheDocument();
    });

    it('открытый список проходит axe', async () => {
        const {container} = render(
            <Select variant="multi" label="Валюты" items={DEPOSITS}
                    itemLabel="visibleName" itemValue="value" itemDisabled="off"/>,
        );
        await userEvent.click(screen.getByRole('combobox'));
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});
        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <Select variant="multi" label="Валюты" name="c" items={DEPOSITS}
                    itemLabel="visibleName" itemValue="value" defaultValue={[1]}/>,
        );
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});

describe('Select: выключенное поле', () => {
    it('кнопка выключена и выпадает из табуляции', async () => {
        render(<Select label="Вид" items={STRINGS} disabled/>);
        const control = screen.getByRole('combobox');

        expect(control).toBeDisabled();

        await userEvent.tab();
        expect(control).not.toHaveFocus();
    });

    it('список не открывается', async () => {
        render(<Select label="Вид" items={STRINGS} disabled/>);

        await userEvent.click(screen.getByRole('combobox'));
        expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    });

    it('значение не уходит в форму', () => {
        render(
            <form>
                <Select label="Вид" name="deposit" items={DEPOSITS} itemLabel="visibleName"
                        itemValue="value" defaultValue={2} disabled/>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;

        /* Выключенное поле в форме не участвует — как любое нативное. */
        expect(new FormData(form).getAll('deposit')).toEqual([]);
    });

    it('чипсы не убираются', async () => {
        render(
            <Select variant="multi" label="Валюты" items={STRINGS} defaultValue={['Детский']} disabled/>,
        );
        const chip = screen.getByRole('button', {name: 'Убрать Детский'});

        expect(chip).toBeDisabled();

        /*
         * Клик программный, а не через userEvent: у выключенного чипса
         * pointer-events: none, и userEvent отказывается по нему целиться,
         * то есть проверял бы CSS вместо поведения. Настоящий disabled
         * не пускает и такой клик.
         */
        chip.click();
        expect(screen.getByRole('button', {name: 'Убрать Детский'})).toBeInTheDocument();
    });
});

describe('Select: обязательный выбор', () => {
    /*
     * Скрытые поля со значениями в проверке формы не участвуют: type="hidden"
     * исключён из неё спецификацией. Поэтому required держит отдельный
     * спутник без имени — до него у поля выбора не было ни required,
     * ни состояния ошибки вовсе.
     */
    function submit() {
        return act(async () => (document.querySelector('form') as HTMLFormElement).requestSubmit());
    }

    it('пустое поле не даёт отправить форму', async () => {
        render(
            <form>
                <Select label="Вид депозита" name="deposit" items={STRINGS} required/>
                <button>Отправить</button>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;
        const onSubmit = vi.fn(event => event.preventDefault());

        form.addEventListener('submit', onSubmit);
        await submit();

        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('сообщение браузера появляется под полем и связано с кнопкой', async () => {
        render(
            <form>
                <Select label="Вид депозита" name="deposit" items={STRINGS} required/>
            </form>,
        );
        const trigger = screen.getByRole('combobox');

        await submit();

        expect(trigger).toHaveAttribute('aria-invalid', 'true');
        expect(trigger).toHaveAccessibleDescription(/\S/);
    });

    it('после выбора ошибка уходит и форма отправляется', async () => {
        render(
            <form>
                <Select label="Вид депозита" name="deposit" items={STRINGS} required/>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;
        const onSubmit = vi.fn(event => event.preventDefault());

        form.addEventListener('submit', onSubmit);
        await submit();
        expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');

        await openList();
        await userEvent.click(screen.getByRole('option', {name: 'Детский'}));

        expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-invalid');

        await submit();
        expect(onSubmit).toHaveBeenCalled();
    });

    it('у спутника есть id, но нет имени', () => {
        /*
         * Имя отправило бы значение вторым полем. Но и без имени, и без id
         * браузер пишет в Issues «A form field element should have an id
         * or name attribute» — замерено в Chromium 141, подсказка
         * про автозаполнение. Отсюда id и autocomplete="off".
         */
        const {container} = render(
            <Select label="Вид депозита" name="deposit" items={STRINGS} required/>,
        );
        const proxy = container.querySelector('input:not([type="hidden"])') as HTMLInputElement;

        expect(proxy).toHaveAttribute('id');
        expect(proxy).not.toHaveAttribute('name');
        expect(proxy).toHaveAttribute('autocomplete', 'off');
    });

    it('спутник не отправляет ничего своего', async () => {
        render(
            <form>
                <Select label="Вид депозита" name="deposit" items={STRINGS} defaultValue="Детский" required/>
            </form>,
        );
        const form = document.querySelector('form') as HTMLFormElement;

        /* Ровно одно значение и ровно одно имя: у спутника имени нет. */
        expect([...new FormData(form).keys()]).toEqual(['deposit']);
    });

    it('кнопка помечена обязательной для скринридера', () => {
        render(<Select label="Вид депозита" items={STRINGS} required/>);
        expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', 'true');
    });

    it('обязательное поле проходит axe', async () => {
        const {container} = render(
            <Select label="Вид депозита" name="deposit" items={STRINGS} required/>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });
});

describe('Select: своя ошибка', () => {
    it('показана под полем и объявлена описанием кнопки', () => {
        render(<Select label="Валюты" items={STRINGS} error="Выберите хотя бы одну"/>);
        const trigger = screen.getByRole('combobox');

        expect(screen.getByText('Выберите хотя бы одну')).toBeInTheDocument();
        expect(trigger).toHaveAccessibleDescription('Выберите хотя бы одну');
        expect(trigger).toHaveAttribute('aria-invalid', 'true');
    });

    it('помечает коробку, а не только текст', () => {
        render(<Select label="Валюты" items={STRINGS} error="Ошибка"/>);
        expect(screen.getByRole('combobox').closest('[data-invalid]')).not.toBeNull();
    });

    it('без ошибки живая область пуста, но в разметке есть', () => {
        const {container} = render(<Select label="Валюты" items={STRINGS}/>);
        const live = container.querySelector('[aria-live="polite"]');

        expect(live).not.toBeNull();
        expect(live).toBeEmptyDOMElement();
    });
});

describe('Select: второе нажатие не теряет поле', () => {
    /*
     * Замерено в Chromium: после второго клика (список закрылся) кнопка
     * остаётся в фокусе, но :focus-visible по мышиному клику она
     * не получает — и поле выглядело погасшим, хотя было активным.
     * Подсветку рамки и подписи переключили на :focus-within; вид проверяется
     * браузерным замером, здесь — поведение под ним.
     */
    it('после закрытия кликом фокус остаётся на поле', async () => {
        render(<Select label="Вид депозита" items={STRINGS}/>);
        const trigger = screen.getByRole('combobox');

        await userEvent.click(trigger);
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        await userEvent.click(trigger);

        expect(screen.queryByRole('listbox')).toBeNull();
        expect(trigger).toHaveFocus();
    });

    it('список лежит внутри коробки: иначе :focus-within до него не достанет', () => {
        const {container} = render(<Select label="Вид депозита" items={STRINGS}/>);
        const box = container.querySelector('[data-variant]') as HTMLElement;

        expect(box.querySelector('[role="listbox"]')).not.toBeNull();
    });
});
