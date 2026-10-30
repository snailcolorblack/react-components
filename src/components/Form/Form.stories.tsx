import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '../Button/Button';
import {Input} from '../Input/Input';
import {Select} from '../Select/Select';
import {Typography} from '../Typography/Typography';
import {Form} from './Form';
import type {FormValues} from './Form.interface.ts';

const meta = {
    title: 'Формы/Form',
    component: Form,
    decorators: [
        Story => (
            <div style={{inlineSize: 'min(32rem, calc(100vw - 4rem))'}}>
                <Story/>
            </div>
        ),
    ],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `Сбор значений, проверка и отправка. Значения не живут в состоянии React:
они лежат в самих полях и собираются один раз, на отправке, через \`FormData\`. Перерисовок
на нажатие клавиши нет вовсе — это и есть причина, по которой форма такая маленькая.

Проверки внутри нет, есть место, куда её подключают: проп \`validate\` ждёт карту
«имя поля → ошибка», и Zod, Yup, Valibot и проверка руками подключаются одинаково.

Форма идёт с \`noValidate\`, потому что текст браузерной ошибки берётся из языка браузера,
а не страницы — замерено, в Chromium с английским интерфейсом при \`lang="ru"\` выходит
«Please fill out this field.». Проп \`native\` возвращает первую проверку платформе.

Фокус после непройденной проверки уходит на первое негодное поле (WCAG 3.3.1). Замерено:
у \`Select\` значение несут скрытые \`input\`, которых при пустом выборе нет вовсе, поэтому
фокус ищется ещё и по \`aria-invalid\` — иначе он оставался на \`body\`.

С \`Flow\` соединяется через платформу: кнопка «Дальше» живёт в рамке процесса, снаружи
формы, и ссылается на неё атрибутом \`form\`. Замерено в Chromium 141 — щелчок по такой
кнопке и Enter в поле одинаково отправляют форму шага.`,
            },
        },
    },
} satisfies Meta<typeof Form>;

export default meta;

type Story = StoryObj<typeof meta>;

function check(values: FormValues) {
    const errors: Record<string, string> = {};
    const sum = String(values.sum ?? '').trim();

    if (String(values.city ?? '') === '') errors.city = 'Выберите город';
    if (!/^\d+$/.test(sum) || Number(sum) < 1000) errors.sum = 'Сумма — число не меньше 1000';

    return Object.keys(errors).length > 0 ? errors : undefined;
}

/** Проверка руками. На её месте одинаково хорошо встаёт Zod. */
export const СПроверкой: Story = {
    args: {
        style: {display: 'grid', gap: '1rem'},
        validate: check,
        onSubmit: values => alert(JSON.stringify(values, null, 2)),
        children: ({errors}) => (
            <>
                <Typography as="h3">Заявка</Typography>
                <Select label="Город" name="city" items={['Душанбе', 'Худжанд', 'Бохтар']} error={errors.city}/>
                <Input label="Сумма" name="sum" inputMode="numeric" error={errors.sum}/>
                <div><Button type="submit">Отправить</Button></div>
            </>
        ),
    },
};

/** Ответ сервера: ошибка приходит после отправки и ложится на поле. */
export const ОтветСервера: Story = {
    args: {
        style: {display: 'grid', gap: '1rem'},
        onSubmit: async (_values, tools) => {
            await new Promise(resolve => setTimeout(resolve, 800));
            tools.setErrors({login: 'Логин занят'});
        },
        children: ({errors, pending}) => (
            <>
                <Input label="Логин" name="login" defaultValue="ivanov" error={errors.login}/>
                <div><Button type="submit" loading={pending}>Проверить</Button></div>
            </>
        ),
    },
};

/**
 * Кнопка снаружи формы. Так форма соединяется с `Flow`: рамка процесса
 * рисует кнопки, а форма живёт внутри шага.
 */
export const КнопкаСнаружи: Story = {
    args: {
        id: 'форма-снаружи',
        style: {display: 'grid', gap: '1rem'},
        validate: check,
        onSubmit: values => alert(JSON.stringify(values, null, 2)),
        children: ({errors}) => (
            <>
                <Select label="Город" name="city" items={['Душанбе', 'Худжанд']} error={errors.city}/>
                <Input label="Сумма" name="sum" inputMode="numeric" error={errors.sum}/>
            </>
        ),
    },
    render: args => (
        <div style={{display: 'grid', gap: '1rem'}}>
            <Form {...args}/>
            <div>
                <Button type="submit" form="форма-снаружи">Дальше</Button>
            </div>
        </div>
    ),
};

/** `native` отдаёт первую проверку браузеру: `required`, `min`, `pattern`. */
export const ПроверкойБраузера: Story = {
    args: {
        native: true,
        style: {display: 'grid', gap: '1rem'},
        onSubmit: values => alert(JSON.stringify(values, null, 2)),
        children: (
            <>
                <Input label="Почта" name="mail" type="email" required/>
                <div><Button type="submit">Отправить</Button></div>
            </>
        ),
    },
};
