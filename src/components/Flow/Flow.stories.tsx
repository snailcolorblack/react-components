import {useState} from 'react';
import {Alert} from '../Alert/Alert';
import {Button} from '../Button/Button';
import {Input} from '../Input/Input';
import {Progress} from '../Progress/Progress';
import {Select} from '../Select/Select';
import {Flow} from './Flow';
import {useFlow} from './Flow.context';
import type {Meta, StoryObj} from '@storybook/react-vite';
import type {FlowStep, FlowTools} from './Flow.interface.ts';

interface Application {
    city: string;
    sum: string;
    comment: string;
    needCall: boolean;
}

const EMPTY: Application = {city: '', sum: '', comment: '', needCall: true};

const meta = {
    title: 'Процессы/Flow',
    component: Flow,
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
                component: `Процесс на несколько страниц: один набор данных, разложенный по шагам.
Шаги читают состояние через \`useFlow()\` и друг о друге не знают.

Frame живёт в адресе (\`?step=…\`), переход вперёд — \`pushState\`. Поэтому «назад» и «вперёд»
у браузера и жест назад на телефоне работают сами, перезагрузка не выбрасывает в начало,
а ссылку на шаг можно скопировать. Пускает она при этом только на пройденное: в адресе
может оказаться что угодно.

Проверки значений внутри нет намеренно. Их делает \`onLeave\` у шага — любой библиотекой,
какая нравится; там же шаг уходит на сервер. Вернул \`false\` — перехода не будет, и это
не ошибка; бросил исключение — попадёт в \`error\`.`,
            },
        },
    },
} satisfies Meta<typeof Flow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Общая обвязка шага: заголовок, полоса хода дела и кнопки. */
function Frame({title, children}: {title: string, children?: React.ReactNode}) {
    const {currentStepIndex, stepsLength, isFirst, isLast, goPrevStep, goNextStep, pending, error} = useFlow<Application>();

    return (
        <section style={{display: 'grid', gap: '1rem'}}>
            <Progress
                label="Заполнение заявки" showLabel
                value={currentStepIndex + 1} max={stepsLength}
                format={(value, max) => `${value} из ${max}`}
            />
            <h3 style={{margin: 0}}>{title}</h3>
            {children}
            {error !== undefined && <p style={{color: 'var(--danger-color-soft)'}}>{String(error)}</p>}
            <div style={{display: 'flex', gap: '0.5rem'}}>
                {!isFirst && <Button variant="OUTLINE" onClick={goPrevStep}>Назад</Button>}
                <Button loading={pending} onClick={goNextStep}>{isLast ? 'Отправить' : 'Дальше'}</Button>
            </div>
        </section>
    );
}

function City() {
    const {data, setData} = useFlow<Application>();

    return (
        <Frame title="Откуда вы?">
            <Select
                label="City" items={['Душанбе', 'Худжанд', 'Бохтар']} defaultValue={data.city}
                onChange={value => setData(was => ({...was, city: value ?? ''}))}
            />
        </Frame>
    );
}

function Sum() {
    const {data, setData} = useFlow<Application>();

    return (
        <Frame title="Сколько нужно?">
            <Input
                label="Sum" inputMode="numeric" value={data.sum}
                onChange={value => setData(was => ({...was, sum: value}))}
            />
        </Frame>
    );
}

function Note() {
    const {data, setData} = useFlow<Application>();

    return (
        <Frame title="Что уточнить при звонке?">
            <Input
                label="Note" value={data.comment}
                onChange={value => setData(was => ({...was, comment: value}))}
            />
        </Frame>
    );
}

function Done() {
    const {data} = useFlow<Application>();

    return (
        <Frame title="Проверьте заявку">
            <pre style={{margin: 0, fontSize: '0.875rem'}}>{JSON.stringify(data, null, 2)}</pre>
        </Frame>
    );
}

const STEPS: FlowStep<Application>[] = [
    {name: 'city', component: City},
    {name: 'sum', component: Sum},
    {name: 'comment', component: Note, when: data => data.needCall},
    {name: 'done', component: Done},
];

/** Четыре шага, данные общие, ход дела виден полосой. */
export const Процесс: Story = {
    args: {steps: STEPS as never, initial: EMPTY as never},
    render: args => <Flow {...args} onFinish={data => window.alert(JSON.stringify(data))}/>,
};

/**
 * Проверка на шаге. `onLeave` возвращает `false` — перехода нет, а что
 * показать, решает сам шаг. City обязателен: не выбрав, дальше не пустят.
 */
export const СПроверкой: Story = {
    args: {steps: STEPS as never, initial: EMPTY as never},
    render: args => <CheckDemo {...args}/>,
};

function CheckDemo(args: React.ComponentProps<typeof Flow>) {
    const [said, say] = useState('');

    const steps: FlowStep<Application>[] = [
        {
            name: 'city',
            component: City,
            onLeave: data => {
                if (data.city === '') {
                    say('Выберите город — без него заявку не принять.');

                    return false;
                }

                say('');

                return true;
            },
        },
        ...STEPS.slice(1),
    ];

    return (
        <>
            {said !== '' && <p style={{color: 'var(--danger-color-soft)'}}>{said}</p>}
            <Flow {...args} steps={steps as never} initial={EMPTY as never}/>
        </>
    );
}

/**
 * Отправка шага на сервер. `onLeave` асинхронный — пока он идёт, `pending`
 * равен `true`, кнопка крутится, а повторное нажатие второго перехода
 * не делает. Исключение попадает в `error`.
 */
export const СОтправкой: Story = {
    args: {steps: STEPS as never, initial: EMPTY as never},
    render: args => (
        <Flow
            {...args}
            steps={[
                {
                    name: 'city',
                    component: City,
                    onLeave: async () => {
                        await new Promise(resolve => setTimeout(resolve, 900));

                        throw new Error('Сервер не ответил. Попробуйте ещё раз.');
                    },
                },
                ...STEPS.slice(1),
            ] as never}
        />
    ),
};

/** Экран «готово / не вышло»: решает по status, а не по отдельному шагу. */
function Result() {
    const {status} = useFlow<Application>();

    return (
        <div style={{display: 'grid', gap: '1rem'}}>
            {status?.ok === true
                ? <Alert variant="SUCCESS" withIcon>Application принята.</Alert>
                : <Alert variant="ERROR" withIcon>{String(status?.reason ?? 'Что-то пошло не так.')}</Alert>}
        </div>
    );
}

/**
 * Итоговый экран, одна штука на обе концовки. Удачная — процесс уходит
 * туда сам после `onFinish`. Окончательная неудача (заявка просрочена,
 * ссылка уже использована) — `finish(false, reason)` прямо из `onLeave`:
 * возвращаться некуда, и держать человека на шаге незачем.
 *
 * В порядок и счётчик такой шаг не входит: это не часть пути, а его конец.
 */
export const СИтогом: Story = {
    args: {steps: STEPS as never, initial: EMPTY as never},
    render: args => (
        <Flow
            {...args}
            onFinish={() => {}}
            steps={[
                {
                    name: 'city',
                    component: City,
                    onLeave: (data: Application, flow: FlowTools<Application>) =>
                        (data.city === 'Бохтар' ? flow.finish(false, 'Срок заявки истёк.') : undefined),
                },
                ...STEPS.slice(1),
                {name: 'result', component: Result, result: true},
            ] as never}
        />
    ),
};

/**
 * Черновик. Ключ передан — данные, шаг и пройденный путь переживают
 * перезагрузку. Пройдите пару шагов и обновите страницу.
 */
export const СЧерновиком: Story = {
    args: {steps: STEPS as never, initial: EMPTY as never, draft: 'демо-заявка'},
};
