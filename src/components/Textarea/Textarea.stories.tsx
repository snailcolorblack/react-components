import type {Meta, StoryObj} from '@storybook/react-vite';
import {Textarea} from './Textarea';

const meta = {
    title: 'Формы/Textarea',
    component: Textarea,
    args: {label: 'Комментарий'},
    parameters: {
        docs: {description: {component: `То же поле, что у Input, без приписок и без маски: обёртка и текст. Коробка
с плавающей подписью общая с Input и Select.

Авторост считает браузер: \`field-sizing: content\` пересчитывает высоту под содержимое,
поэтому здесь нет ни обработчика ввода, ни измерения \`scrollHeight\`, ни скачка на первой
отрисовке. Замерено в Chromium: поле выросло с 24px до 144px на шести строках и упёрлось
в потолок \`--textarea-max\` (12 строк). Там, где свойство не поддержано, остаётся обычная
textarea на \`rows\` строк с прокруткой.`}},
        layout: 'padded',
    },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Обычное: Story = {};

export const СТекстом: Story = {args: {defaultValue: 'Первая строка\nВторая строка'}};

/** Растёт под содержимое — попробуйте набрать несколько строк. */
export const Авторост: Story = {args: {label: 'Заметка', placeholder: 'Набирайте — поле будет расти'}};

/** Без автороста поле остаётся ровно на `rows` строк и получает прокрутку. */
export const БезАвтороста: Story = {
    args: {label: 'Заметка', autoGrow: false, rows: 3, defaultValue: 'раз\nдва\nтри\nчетыре\nпять'},
};

export const СОграничением: Story = {args: {label: 'Отзыв', maxLength: 200, rows: 4}};

export const Выключенное: Story = {args: {defaultValue: 'Нельзя менять', disabled: true}};

/**
 * Ошибка браузера под полем: пузырь погашен, текст лежит в разметке
 * и связан с полем через `aria-describedby`.
 */
export const Ошибка: Story = {
    render: () => (
        <form style={{display: 'grid', gap: '1rem'}}>
            <Textarea label="Комментарий" name="comment" required minLength={10}
                      placeholder="Не меньше десяти символов"/>
            <button type="submit">Отправить</button>
        </form>
    ),
};

/** Своя ошибка: ответ сервера или проверка по другим полям формы. */
export const СвояОшибка: Story = {
    args: {label: 'Комментарий', defaultValue: 'Коротко', error: 'Расскажите подробнее'},
};
