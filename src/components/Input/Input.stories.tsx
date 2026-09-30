import {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '../Button/Button';
import {Input} from './Input';

const meta = {
    title: 'Формы/Input',
    component: Input,
    args: {label: 'Имя'},
    parameters: {
        docs: {description: {component: `Внутри настоящий \`<input>\`: типы, \`required\`, \`pattern\`, автозаполнение,
проверка формы и объявление ошибки — всё платформенное. Компонент добавляет коробку
с плавающей подписью (общую с Select и Textarea), маску и приписки.

Обёртка — \`<label>\`, поэтому клик по любому месту коробки ставит фокус в поле:
это делает браузер, обработчиков нет.

Ошибку показывает \`:user-invalid\`, а не \`:invalid\`: рамка краснеет после того, как
человек закончил ввод, а не при открытии формы. Замерено в Chromium: во время набора
рамка обычная, после ухода фокуса — красная, после исправления снова обычная.`}},
        layout: 'padded',
    },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Обычное: Story = {};

export const СЗначением: Story = {args: {defaultValue: 'Слава'}};

/** Подсказка видна только у поля в фокусе: в покое её место занимает подпись. */
export const СПодсказкой: Story = {args: {label: 'Город', placeholder: 'Например, Казань'}};

/**
 * Маска раскладывает ввод: `#` — место под символ, остальное литералы. Они
 * подставляются сами, в значение не попадают и при вводе игнорируются.
 * `format` отдельно ограничивает, что вообще можно набрать.
 */
export const Маска: Story = {
    args: {label: 'Телефон', mask: '+7 ### ##-##-##', format: /\d/, inputMode: 'tel'},
};

export const МаскаДаты: Story = {
    args: {label: 'Дата', mask: '##.##.####', format: /\d/, inputMode: 'numeric', placeholder: 'дд.мм.гггг'},
};

/** Без маски `format` работает как фильтр: недопустимое просто не вводится. */
export const ТолькоЦифры: Story = {
    args: {label: 'Индекс', format: /\d/, inputMode: 'numeric', maxLength: 6},
};

/** Приписка справа: видна, но в значение и в форму не попадает. */
export const Суффикс: Story = {args: {label: 'Цена', suffix: '₽', format: /\d/, defaultValue: '1000'}};

/**
 * Приписка слева. Поле с префиксом держит подпись наверху даже пустым —
 * иначе съехавшая в центр подпись легла бы прямо на приписку (замерено).
 */
export const Префикс: Story = {args: {label: 'Сайт', prefix: 'https://'}};

/** С `affixInValue` приписки уходят в значение и в форму скрытым полем. */
export const ПрипискиВЗначении: Story = {
    render: function WithAffix() {
        const [value, setValue] = useState('example.com');

        return <>
            <Input label="Сайт" prefix="https://" affixInValue value={value} onChange={setValue}/>
            <p>Значение: {value}</p>
        </>;
    },
};

/**
 * Ошибка браузера. Текст лежит под полем, в разметке, и связан с полем
 * через `aria-describedby` — пузырь погашен: он исчезает по таймеру
 * и на него нельзя сослаться. Появляется, когда поле покинули или
 * попытались отправить форму. Язык текста — язык браузера, не страницы.
 *
 * Введите не почту и нажмите Tab.
 */
export const Ошибка: Story = {
    render: () => (
        <form style={{display: 'grid', gap: '1rem'}}>
            <Input label="Почта" name="mail" type="email" required placeholder="you@example.com"/>
            <Button type="submit">Отправить</Button>
        </form>
    ),
};

export const Выключенное: Story = {args: {defaultValue: 'Нельзя менять', disabled: true}};

/**
 * Своя ошибка: то, чего браузер знать не может, — ответ сервера, проверка
 * по другим полям. Пока она задана, браузерное сообщение не показывается;
 * снимается тоже снаружи.
 */
export const СвояОшибка: Story = {
    args: {label: 'Логин', defaultValue: 'admin', error: 'Такой логин уже занят'},
};
