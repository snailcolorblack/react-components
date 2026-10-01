import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Input} from './Input';
import {capacity, display, keep, paint, unmask} from './Input.mask';

/*
 * Маска проверяется таблицей «ввод → результат» на чистых функциях, а сам
 * компонент — разметкой, формой и клавиатурой. Геометрии нет: плавающая
 * подпись считается движком, которого в jsdom не существует.
 */

const PHONE = '+7 ### ##-##-##';

describe('Маска: чистые функции', () => {
    it('capacity считает места под символы', () => {
        expect(capacity(PHONE)).toBe(9);
        expect(capacity('##.##.####')).toBe(8);
    });

    it('keep оставляет только допустимые символы', () => {
        expect(keep('a1b2', /\d/)).toBe('12');
        expect(keep('a1b2')).toBe('a1b2');
    });

    it('keep не зависит от флага g: lastIndex не переносится', () => {
        const global = /\d/g;

        expect(keep('123', global)).toBe('123');
        expect(keep('123', global)).toBe('123');
    });

    it('unmask снимает литералы, стоящие на своих местах', () => {
        expect(unmask('+7 916 12-34-56', PHONE)).toBe('916123456');
        expect(unmask('916123456', PHONE)).toBe('916123456');
        expect(unmask('+7 9', PHONE)).toBe('9');
    });

    it('paint выводит литералы только перед заполненным местом', () => {
        expect(paint('', PHONE).view).toBe('');
        expect(paint('9', PHONE).view).toBe('+7 9');
        expect(paint('916', PHONE).view).toBe('+7 916');
        expect(paint('9161', PHONE).view).toBe('+7 916 1');
        expect(paint('9161234', PHONE).view).toBe('+7 916 12-34');
        expect(paint('916123456', PHONE).view).toBe('+7 916 12-34-56');
    });

    it('paint отдаёт позиции содержательных символов', () => {
        const {view, at} = paint('916', PHONE);

        expect(at.map(index => view[index])).toEqual(['9', '1', '6']);
    });

    it('display идемпотентен: размеченное значение не меняется', () => {
        const once = display('916123456', PHONE, /\d/).view;

        expect(once).toBe('+7 916 12-34-56');
        expect(display(once, PHONE, /\d/).view).toBe(once);
    });

    it('display обрезает лишнее по числу мест', () => {
        expect(display('91612345678999', PHONE, /\d/).view).toBe('+7 916 12-34-56');
    });
});

describe('Input', () => {
    it('подпись связана с полем, клик по коробке ставит фокус', async () => {
        render(<Input label="Имя"/>);
        const input = screen.getByRole('textbox', {name: 'Имя'});

        /* Подпись кликов не ловит (pointer-events: none), их ловит коробка. */
        await userEvent.click(input.closest('label') as HTMLElement);
        expect(input).toHaveFocus();
    });

    it('пустое поле не помечено заполненным', () => {
        render(<Input label="Имя"/>);
        expect(screen.getByRole('textbox').closest('[data-filled]')).toBeNull();
    });

    it('с текстом поле помечено заполненным', () => {
        render(<Input label="Имя" defaultValue="Слава"/>);
        expect(screen.getByRole('textbox').closest('[data-filled]')).not.toBeNull();
    });

    it('набранное уходит в форму по name', async () => {
        render(<form><Input label="Имя" name="name"/></form>);
        const form = document.querySelector('form') as HTMLFormElement;

        await userEvent.type(screen.getByRole('textbox'), 'Слава');
        expect(new FormData(form).get('name')).toBe('Слава');
    });

    it('onChange отдаёт показанное и сырое', async () => {
        const onChange = vi.fn();

        render(<Input label="Телефон" mask={PHONE} format={/\d/} onChange={onChange}/>);
        await userEvent.type(screen.getByRole('textbox'), '916');

        expect(onChange).toHaveBeenLastCalledWith('+7 916', '916');
    });

    it('маска раскладывает ввод по ходу набора', async () => {
        render(<Input label="Телефон" mask={PHONE} format={/\d/}/>);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await userEvent.type(input, '9161234');
        expect(input.value).toBe('+7 916 12-34');

        await userEvent.type(input, '56');
        expect(input.value).toBe('+7 916 12-34-56');
    });

    it('маска не пускает лишние символы сверх числа мест', async () => {
        render(<Input label="Телефон" mask={PHONE} format={/\d/}/>);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await userEvent.type(input, '91612345555');
        expect(input.value).toBe('+7 916 12-34-55');
    });

    it('format не пускает недопустимые символы', async () => {
        render(<Input label="Телефон" format={/\d/}/>);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await userEvent.type(input, 'a9b1c6');
        expect(input.value).toBe('916');
    });

    it('вставка целиком раскладывается так же, как набор', async () => {
        render(<Input label="Телефон" mask={PHONE} format={/\d/}/>);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await userEvent.click(input);
        await userEvent.paste('9161234567');
        expect(input.value).toBe('+7 916 12-34-56');
    });

    it('значение снаружи приводится к маске', () => {
        render(<Input label="Телефон" mask={PHONE} format={/\d/} value="916123456" onChange={() => {}}/>);
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('+7 916 12-34-56');
    });

    it('управляемое поле слушается владельца', async () => {
        function Controlled() {
            const [value, setValue] = useState('');

            return <>
                <Input label="Имя" value={value} onChange={setValue}/>
                <output>{value}</output>
            </>;
        }

        render(<Controlled/>);
        await userEvent.type(screen.getByRole('textbox'), 'Аня');
        expect(screen.getByRole('status')).toHaveTextContent('Аня');
    });

    it('каретка остаётся на месте правки, а не уезжает в конец', async () => {
        render(<Input label="Телефон" mask={PHONE} format={/\d/} defaultValue="916123456"/>);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        /* «+7 916 12-34-56»: ставим каретку после «91» и печатаем цифру. */
        input.setSelectionRange(5, 5);
        await userEvent.type(input, '0', {initialSelectionStart: 5, initialSelectionEnd: 5});

        expect(input.value).toBe('+7 910 61-23-45');
        expect(input.selectionStart).toBe(6);
    });
});

describe('Input: приписки', () => {
    it('приписки видны, но не входят в значение', async () => {
        render(<form><Input label="Цена" name="price" prefix="от" suffix="₽"/></form>);
        const form = document.querySelector('form') as HTMLFormElement;

        expect(screen.getByText('от')).toBeInTheDocument();
        expect(screen.getByText('₽')).toBeInTheDocument();

        await userEvent.type(screen.getByRole('textbox'), '1000');
        expect(new FormData(form).get('price')).toBe('1000');
    });

    it('приписки не становятся частью имени поля, а читаются пояснением', () => {
        render(<Input label="Цена" suffix="₽"/>);
        const input = screen.getByRole('textbox', {name: 'Цена'});

        expect(input).toHaveAccessibleDescription('₽');
    });

    it('своё aria-describedby не затирается', () => {
        render(<>
            <Input label="Цена" suffix="₽" aria-describedby="hint"/>
            <p id="hint">Без копеек</p>
        </>);

        expect(screen.getByRole('textbox')).toHaveAccessibleDescription('₽ Без копеек');
    });

    it('affixInValue отправляет полную строку скрытым полем', async () => {
        render(<form><Input label="Сайт" name="site" prefix="https://" affixInValue/></form>);
        const form = document.querySelector('form') as HTMLFormElement;

        await userEvent.type(screen.getByRole('textbox'), 'example.com');

        /* Одно значение, а не два: видимое поле остаётся без name. */
        expect(new FormData(form).getAll('site')).toEqual(['https://example.com']);
    });

    it('affixInValue отдаёт приписки и в onChange', async () => {
        const onChange = vi.fn();

        render(<Input label="Сайт" prefix="https://" affixInValue onChange={onChange}/>);
        await userEvent.type(screen.getByRole('textbox'), 'a');

        expect(onChange).toHaveBeenLastCalledWith('https://a', 'a');
    });

    it('пустое поле не отправляет одни приписки', () => {
        render(<form><Input label="Сайт" name="site" prefix="https://" affixInValue/></form>);
        const form = document.querySelector('form') as HTMLFormElement;

        expect(new FormData(form).get('site')).toBe('');
    });
});

describe('Input: доступность', () => {
    it('проходит axe', async () => {
        const {container} = render(
            <Input label="Телефон" name="phone" mask={PHONE} format={/\d/} suffix="моб." required/>,
        );
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Input label="Имя" name="name" defaultValue="Слава" suffix="₽"/>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });

    it('нативные пропсы доходят до поля', () => {
        render(<Input label="Почта" type="email" required autoComplete="email" inputMode="email"/>);
        const input = screen.getByRole('textbox');

        expect(input).toBeRequired();
        expect(input).toHaveAttribute('type', 'email');
        expect(input).toHaveAttribute('inputmode', 'email');
    });
});

describe('Input: типы без выделения', () => {
    /*
     * У email, number и date нет выделения: setSelectionRange бросает
     * InvalidStateError. Замерено в Chromium — поле type="email" роняло
     * исключение на каждое нажатие, пока каретка ставилась без проверки.
     */
    it('type="email" принимает ввод без исключений', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Input label="Почта" type="email"/>);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await userEvent.type(input, 'a@b.co');
        expect(input.value).toBe('a@b.co');
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });

    it('фильтр работает и там, где каретку не подвинуть', async () => {
        render(<Input label="Возраст" type="number" format={/\d/}/>);
        const input = screen.getByRole('spinbutton') as HTMLInputElement;

        await userEvent.type(input, '4');
        expect(input.value).toBe('4');
    });
});

describe('Input: ошибка', () => {
    /*
     * Пузырь браузера исчезает по таймеру и на него нельзя сослаться,
     * поэтому текст ошибки лежит в разметке и подключён к полю описанием.
     */
    it('своя ошибка видна и читается описанием поля', () => {
        render(<Input label="Логин" error="Такой логин уже занят"/>);
        const input = screen.getByRole('textbox', {name: 'Логин'});

        expect(screen.getByText('Такой логин уже занят')).toBeInTheDocument();
        expect(input).toHaveAccessibleDescription('Такой логин уже занят');
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('своя ошибка помечает коробку, а не только текст', () => {
        render(<Input label="Логин" error="Занят"/>);
        expect(screen.getByRole('textbox').closest('[data-invalid]')).not.toBeNull();
    });

    it('без ошибки область пуста, но в разметке есть', () => {
        /* Живая область должна существовать до появления текста, иначе
           объявлять будет нечего: скринридер следит за уже готовой. */
        const {container} = render(<Input label="Логин"/>);
        const live = container.querySelector('[aria-live="polite"]');

        expect(live).not.toBeNull();
        expect(live).toBeEmptyDOMElement();
        expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
    });

    it('своя ошибка сильнее браузерной', async () => {
        render(<Input label="Почта" type="email" error="Проверьте адрес" defaultValue="не почта"/>);
        const input = screen.getByRole('textbox');

        await userEvent.click(input);
        await userEvent.tab();

        expect(screen.getByText('Проверьте адрес')).toBeInTheDocument();
        expect(input).toHaveAccessibleDescription('Проверьте адрес');
    });

    it('браузерное сообщение появляется под полем на попытке отправить', async () => {
        render(<form><Input label="Имя" name="name" required/><button>Отправить</button></form>);
        const input = screen.getByRole('textbox') as HTMLInputElement;
        const form = document.querySelector('form') as HTMLFormElement;

        /* Через validity, а не checkValidity(): второй сам рассылает
           invalid и тем самым проверял бы уже показанное сообщение. */
        expect(input.validity.valueMissing).toBe(true);

        /* Отправку зовём напрямую: проверка запускается именно ей, а не
           кликом, и событие invalid приходит вне очереди React. */
        await act(async () => form.requestSubmit());

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription(input.validationMessage);
    });

    it('сообщение уходит, как только поле поправили', async () => {
        render(<form><Input label="Имя" name="name" required/><button>Отправить</button></form>);
        const input = screen.getByRole('textbox');
        const form = document.querySelector('form') as HTMLFormElement;

        await act(async () => form.requestSubmit());
        expect(input).toHaveAttribute('aria-invalid', 'true');

        await userEvent.type(input, 'Слава');
        expect(input).not.toHaveAttribute('aria-invalid');
    });

    it('свой onBlur и onInvalid не теряются', async () => {
        const onBlur = vi.fn();
        const onInvalid = vi.fn();

        render(
            <form>
                <Input label="Имя" required onBlur={onBlur} onInvalid={onInvalid}/>
                <button>Отправить</button>
            </form>,
        );

        await userEvent.click(screen.getByRole('textbox'));
        await userEvent.tab();
        expect(onBlur).toHaveBeenCalled();

        await act(async () => (document.querySelector('form') as HTMLFormElement).requestSubmit());
        expect(onInvalid).toHaveBeenCalled();
    });

    it('поле с ошибкой проходит axe', async () => {
        const {container} = render(<Input label="Логин" name="login" error="Занят" suffix="@"/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });
});

describe('Input: приписки в значении не наслаиваются', () => {
    /*
     * Замерено в браузере: значение возвращалось владельцем уже с припиской,
     * компонент её не снимал и клеил новую — после двух символов в поле
     * стояло «https://https://example.co1m2».
     */
    it('управляемое поле не накапливает приписку', async () => {
        function Controlled() {
            const [value, setValue] = useState('example.com');

            return <>
                <Input label="Сайт" prefix="https://" affixInValue value={value} onChange={setValue}/>
                <output>{value}</output>
            </>;
        }

        render(<Controlled/>);
        const input = screen.getByRole('textbox') as HTMLInputElement;

        await userEvent.type(input, '12');

        expect(input.value).toBe('example.com12');
        expect(screen.getByRole('status')).toHaveTextContent('https://example.com12');
    });

    it('приписка-разметка в значение не идёт: приклеить к строке нечего', async () => {
        const onChange = vi.fn();

        render(<Input label="Сайт" prefix={<b>https://</b>} affixInValue onChange={onChange}/>);
        await userEvent.type(screen.getByRole('textbox'), 'a');

        expect(onChange).toHaveBeenLastCalledWith('a', 'a');
    });
});

describe('Input: повторный клик по коробке не роняет фокус', () => {
    /*
     * Замерено в Chromium: нажатие по коробке мимо поля, когда поле уже
     * в фокусе, даёт focusout и только потом focusin от активации label.
     * На экране это мигание — гаснет кольцо, подпись падает в центр
     * и едет обратно.
     */
    function mousedown(node: HTMLElement) {
        const event = new MouseEvent('mousedown', {bubbles: true, cancelable: true});

        node.dispatchEvent(event);

        return event;
    }

    it('нажатие мимо поля гасится, фокус остаётся', () => {
        render(<Input label="Имя"/>);
        const control = screen.getByRole('textbox');
        const box = control.closest('label') as HTMLElement;

        control.focus();
        const event = mousedown(box);

        expect(event.defaultPrevented).toBe(true);
        expect(control).toHaveFocus();
    });

    it('первый клик остаётся платформенным', () => {
        render(<Input label="Имя"/>);
        const control = screen.getByRole('textbox');
        const box = control.closest('label') as HTMLElement;

        /* Поле не в фокусе: гасить нечего, иначе фокус бы и не поставился. */
        const event = mousedown(box);

        expect(event.defaultPrevented).toBe(false);
    });

    it('нажатие по самому полю не трогаем: там каретка', () => {
        render(<Input label="Имя"/>);
        const control = screen.getByRole('textbox');

        control.focus();
        const event = mousedown(control);

        expect(event.defaultPrevented).toBe(false);
    });
});
