import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {ButtonGroup} from './ButtonGroup';

/*
 * Разметка, форма и клавиатура. Таблетки здесь нет: она ездит на CSS
 * anchor positioning, которого в jsdom не существует, — её место
 * в браузерных замерах.
 */

function Sample(props: Partial<Parameters<typeof ButtonGroup>[0]> = {}) {
    return (
        <ButtonGroup label="Способ оплаты" defaultValue="cash" {...props}>
            <ButtonGroup.Item value="cash">В кассе</ButtonGroup.Item>
            <ButtonGroup.Item value="card">Картой</ButtonGroup.Item>
            <ButtonGroup.Item value="wire" disabled>Безналичные</ButtonGroup.Item>
        </ButtonGroup>
    );
}

describe('ButtonGroup: разметка', () => {
    it('это группа с именем, а внутри переключатели', () => {
        render(<Sample/>);

        expect(screen.getByRole('group', {name: 'Способ оплаты'})).toBeInTheDocument();
        expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('имя группы по умолчанию не видно, но оно есть', () => {
        render(<Sample/>);
        /* Легенда вынесена из потока: скринридер её читает, глазами не видно. */
        expect(screen.getByText('Способ оплаты')).toHaveStyle({position: 'absolute'});
    });

    it('showLabel показывает имя глазами', () => {
        render(<Sample showLabel/>);
        expect(screen.getByText('Способ оплаты')).not.toHaveStyle({position: 'absolute'});
    });

    it('подпись кнопки становится именем переключателя', () => {
        render(<Sample/>);
        expect(screen.getByRole('radio', {name: 'В кассе'})).toBeChecked();
    });

    it('выключенный вариант остаётся в группе', () => {
        render(<Sample/>);
        expect(screen.getByRole('radio', {name: 'Безналичные'})).toBeDisabled();
    });
});

describe('ButtonGroup: значение', () => {
    it('выбранное уходит в форму по name', async () => {
        render(<form><Sample name="pay"/></form>);
        const form = document.querySelector('form') as HTMLFormElement;

        expect(new FormData(form).get('pay')).toBe('cash');

        await userEvent.click(screen.getByRole('radio', {name: 'Картой'}));
        expect(new FormData(form).get('pay')).toBe('card');
    });

    it('без name варианты всё равно одна группа', async () => {
        render(<Sample/>);

        await userEvent.click(screen.getByRole('radio', {name: 'Картой'}));

        /* Если бы общего имени не было, отмеченными остались бы оба. */
        expect(screen.getByRole('radio', {name: 'Картой'})).toBeChecked();
        expect(screen.getByRole('radio', {name: 'В кассе'})).not.toBeChecked();
    });

    it('две группы на странице не мешают друг другу', async () => {
        render(<><Sample/><Sample/></>);
        const [first, second] = screen.getAllByRole('group');

        await userEvent.click(within(first).getByRole('radio', {name: 'Картой'}));

        expect(within(first).getByRole('radio', {name: 'Картой'})).toBeChecked();
        expect(within(second).getByRole('radio', {name: 'В кассе'})).toBeChecked();
    });

    it('onChange отдаёт значение', async () => {
        const onChange = vi.fn();

        render(<Sample onChange={onChange}/>);
        await userEvent.click(screen.getByRole('radio', {name: 'Картой'}));

        expect(onChange).toHaveBeenCalledWith('card');
    });

    it('управляемый режим слушается владельца', async () => {
        function Controlled() {
            const [value, setValue] = useState('cash');

            return <>
                <Sample value={value} onChange={setValue}/>
                <output>{value}</output>
            </>;
        }

        render(<Controlled/>);
        await userEvent.click(screen.getByRole('radio', {name: 'Картой'}));

        expect(screen.getByRole('status')).toHaveTextContent('card');
    });

    it('выключенный не выбирается', async () => {
        const onChange = vi.fn();

        render(<Sample onChange={onChange}/>);
        await userEvent.click(screen.getByRole('radio', {name: 'Безналичные'}));

        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('ButtonGroup: клавиатура достаётся от платформы', () => {
    it('на всю группу одна остановка табуляции', async () => {
        render(<Sample/>);

        await userEvent.tab();
        expect(screen.getByRole('radio', {name: 'В кассе'})).toHaveFocus();

        await userEvent.tab();
        expect(screen.getByRole('radio', {name: 'Картой'})).not.toHaveFocus();
    });

    it('стрелка переключает вариант', async () => {
        render(<Sample/>);

        await userEvent.tab();
        await userEvent.keyboard('{ArrowRight}');

        expect(screen.getByRole('radio', {name: 'Картой'})).toBeChecked();
    });
});

describe('ButtonGroup: доступность', () => {
    it('проходит axe', async () => {
        const {container} = render(<Sample/>);
        const results = await axe.run(container, {rules: {'color-contrast': {enabled: false}}});

        expect(results.violations).toEqual([]);
    });

    it('не шумит предупреждениями React', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Sample/>);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });

    it('вариант снаружи группы падает сразу', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => render(<ButtonGroup.Item value="a">Раз</ButtonGroup.Item>))
            .toThrow('ButtonGroup.Item должен лежать внутри <ButtonGroup>');

        error.mockRestore();
    });
});

describe('ButtonGroup: колесо мыши крутит полосу вбок', () => {
    /*
     * Полоса прокручивается вбок, а колесо у мыши одно. Замерено в Chromium:
     * сам браузер вертикальное колесо в горизонтальную прокрутку не переводит
     * — полоса стоит, уезжает страница. Слушатель непассивный: с реактовским
     * onWheel preventDefault() не действует, тоже замерено.
     */
    function strip(container: HTMLElement) {
        const node = container.querySelector('fieldset > div') as HTMLElement;

        /* Размеров в jsdom нет — задаём их руками, иначе прокручивать нечего. */
        Object.defineProperty(node, 'scrollWidth', {value: 300, configurable: true});
        Object.defineProperty(node, 'clientWidth', {value: 200, configurable: true});

        return node;
    }

    function spin(node: HTMLElement, deltaY: number, deltaX = 0) {
        const event = new WheelEvent('wheel', {deltaY, deltaX, bubbles: true, cancelable: true});

        node.dispatchEvent(event);

        return event;
    }

    it('вертикальное колесо двигает полосу и гасит прокрутку страницы', () => {
        const {container} = render(<Sample/>);
        const node = strip(container);

        node.scrollLeft = 0;
        const event = spin(node, 60);

        expect(node.scrollLeft).toBe(60);
        expect(event.defaultPrevented).toBe(true);
    });

    it('на краю прокрутка отдаётся странице, а не упирается', () => {
        const {container} = render(<Sample/>);
        const node = strip(container);

        /* 300 − 200 = 100, то есть правый край. */
        node.scrollLeft = 100;
        const event = spin(node, 60);

        expect(node.scrollLeft).toBe(100);
        expect(event.defaultPrevented).toBe(false);
    });

    it('у левого края вверх тоже отдаётся', () => {
        const {container} = render(<Sample/>);
        const node = strip(container);

        node.scrollLeft = 0;
        const event = spin(node, -60);

        expect(node.scrollLeft).toBe(0);
        expect(event.defaultPrevented).toBe(false);
    });

    it('горизонтальный жест не перехватываем: его разворачивает платформа', () => {
        const {container} = render(<Sample/>);
        const node = strip(container);

        node.scrollLeft = 0;
        const event = spin(node, 0, 60);

        expect(event.defaultPrevented).toBe(false);
    });

    it('прокручивать нечего — колесо не трогаем', () => {
        const {container} = render(<Sample/>);
        const node = container.querySelector('fieldset > div') as HTMLElement;

        /* Без заданных размеров scrollWidth и clientWidth в jsdom равны нулю. */
        const event = spin(node, 60);

        expect(event.defaultPrevented).toBe(false);
    });
});
