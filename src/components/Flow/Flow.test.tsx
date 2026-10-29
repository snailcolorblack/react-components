import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Flow} from './Flow';
import {useFlow} from './Flow.context';
import type {FlowStep} from './Flow.interface.ts';

/*
 * Процесс целиком разбирается в jsdom: и адрес, и история, и хранилище
 * там настоящие. Чего здесь нет — вида: Flow ничего не рисует сам,
 * кроме текущего шага.
 */

interface Data {
    resolved: boolean;
    comment: string;
}

const EMPTY: Data = {resolved: true, comment: ''};

/** Шаг, который показывает своё имя, счётчик и кнопки. */
function page(title: string) {
    return function Page() {
        const {data, setData, goNextStep, goPrevStep, currentStepIndex, stepsLength, pending, error} = useFlow<Data>();

        return (
            <div>
                <h1>{title}</h1>
                <p data-testid="счёт">{currentStepIndex + 1} из {stepsLength}</p>
                <p data-testid="данные">{JSON.stringify(data)}</p>
                {pending && <p>идёт</p>}
                {error !== undefined && <p data-testid="ошибка">{String(error)}</p>}
                <button type="button" onClick={() => setData(was => ({...was, resolved: !was.resolved}))}>
                    переключить
                </button>
                <button type="button" onClick={goPrevStep}>назад</button>
                <button type="button" onClick={goNextStep}>дальше</button>
            </div>
        );
    };
}

const ПЕРВЫЙ = page('Первый');
const ВТОРОЙ = page('Второй');
const ТРЕТИЙ = page('Третий');

function шаги(extra: Partial<FlowStep<Data>> = {}): FlowStep<Data>[] {
    return [
        {name: 'one', component: ПЕРВЫЙ, ...extra},
        {name: 'two', component: ВТОРОЙ},
        {name: 'three', component: ТРЕТИЙ},
    ];
}

const адрес = () => new URLSearchParams(window.location.search).get('step');

/* Заглушка до того, как промис отдаст своё resolve. */
function noop() {}

beforeEach(() => {
    window.history.replaceState(null, '', '/');
    localStorage.clear();
});

afterEach(() => {
    localStorage.clear();
});

describe('Flow: порядок шагов', () => {
    it('начинает с первого шага и кладёт его в адрес', () => {
        render(<Flow steps={шаги()} initial={EMPTY}/>);

        expect(screen.getByRole('heading', {name: 'Первый'})).toBeInTheDocument();
        expect(адрес()).toBe('one');
        expect(screen.getByTestId('счёт')).toHaveTextContent('1 из 3');
    });

    it('дальше и назад водят по шагам', async () => {
        const user = userEvent.setup();
        render(<Flow steps={шаги()} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        expect(screen.getByRole('heading', {name: 'Второй'})).toBeInTheDocument();
        expect(адрес()).toBe('two');

        await user.click(screen.getByRole('button', {name: 'назад'}));
        await waitFor(() => expect(screen.getByRole('heading', {name: 'Первый'})).toBeInTheDocument());
    });

    it('с первого шага назад не уводит', async () => {
        const user = userEvent.setup();
        render(<Flow steps={шаги()} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'назад'}));

        expect(screen.getByRole('heading', {name: 'Первый'})).toBeInTheDocument();
    });

    it('«назад» у браузера возвращает на предыдущий шаг, а не со страницы', async () => {
        const user = userEvent.setup();
        render(<Flow steps={шаги()} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        await user.click(screen.getByRole('button', {name: 'дальше'}));
        expect(screen.getByRole('heading', {name: 'Третий'})).toBeInTheDocument();

        /* Настоящий возврат браузера: переход вперёд кладёт запись
           в историю, поэтому назад идём по шагам. */
        window.history.back();
        await waitFor(() => expect(screen.getByRole('heading', {name: 'Второй'})).toBeInTheDocument());
        expect(адрес()).toBe('two');

        window.history.back();
        await waitFor(() => expect(screen.getByRole('heading', {name: 'Первый'})).toBeInTheDocument());
    });

    it('«вперёд» у браузера возвращает обратно по пройденному', async () => {
        const user = userEvent.setup();
        render(<Flow steps={шаги()} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        window.history.back();
        await waitFor(() => expect(screen.getByRole('heading', {name: 'Первый'})).toBeInTheDocument());

        window.history.forward();
        await waitFor(() => expect(screen.getByRole('heading', {name: 'Второй'})).toBeInTheDocument());
    });
});

describe('Flow: пропуск шагов', () => {
    const сУсловием: FlowStep<Data>[] = [
        {name: 'one', component: ПЕРВЫЙ},
        {name: 'two', component: ВТОРОЙ, when: data => data.resolved},
        {name: 'three', component: ТРЕТИЙ},
    ];

    it('невидимый шаг выпадает и из порядка, и из счётчика', async () => {
        const user = userEvent.setup();
        render(<Flow steps={сУсловием} initial={{...EMPTY, resolved: false}}/>);

        expect(screen.getByTestId('счёт')).toHaveTextContent('1 из 2');

        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(screen.getByRole('heading', {name: 'Третий'})).toBeInTheDocument();
        expect(адрес()).toBe('three');
    });

    it('видимый шаг проходится как обычно', async () => {
        const user = userEvent.setup();
        render(<Flow steps={сУсловием} initial={EMPTY}/>);

        expect(screen.getByTestId('счёт')).toHaveTextContent('1 из 3');

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        expect(screen.getByRole('heading', {name: 'Второй'})).toBeInTheDocument();
    });

    it('условие считается по свежим данным: ответ на шаге меняет порядок', async () => {
        const user = userEvent.setup();
        render(<Flow steps={сУсловием} initial={EMPTY}/>);

        /* На первом шаге отвечаем так, что второй шаг больше не нужен. */
        await user.click(screen.getByRole('button', {name: 'переключить'}));
        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(screen.getByRole('heading', {name: 'Третий'})).toBeInTheDocument();
    });
});

describe('Flow: переход отдан наружу', () => {
    it('onLeave получает данные и пускает дальше', async () => {
        const onLeave = vi.fn();
        const user = userEvent.setup();
        render(<Flow steps={шаги({onLeave})} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(onLeave).toHaveBeenCalledWith(EMPTY, expect.objectContaining({finish: expect.any(Function)}));
        expect(screen.getByRole('heading', {name: 'Второй'})).toBeInTheDocument();
    });

    it('false останавливает переход и ошибкой не считается', async () => {
        const user = userEvent.setup();
        render(<Flow steps={шаги({onLeave: () => false})} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(screen.getByRole('heading', {name: 'Первый'})).toBeInTheDocument();
        expect(адрес()).toBe('one');
        expect(screen.queryByTestId('ошибка')).toBeNull();
    });

    it('исключение останавливает переход и попадает в error', async () => {
        const user = userEvent.setup();
        render(<Flow steps={шаги({onLeave: () => {
            throw new Error('сервер не ответил');
        }})} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(screen.getByRole('heading', {name: 'Первый'})).toBeInTheDocument();
        expect(screen.getByTestId('ошибка')).toHaveTextContent('сервер не ответил');
    });

    it('пока идёт onLeave, процесс занят и второй переход не случается', async () => {
        const user = userEvent.setup();
        let release: () => void = noop;

        function hold() {
            return new Promise<void>(resolve => {
                release = resolve;
            });
        }

        const onLeave = vi.fn(hold);
        render(<Flow steps={шаги({onLeave})} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        expect(screen.getByText('идёт')).toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        expect(onLeave).toHaveBeenCalledTimes(1);

        release();
        await waitFor(() => expect(screen.getByRole('heading', {name: 'Второй'})).toBeInTheDocument());
    });

    it('onFinish зовётся на последнем шаге, а шаг не меняется', async () => {
        const onFinish = vi.fn();
        const user = userEvent.setup();
        render(<Flow steps={шаги()} initial={EMPTY} onFinish={onFinish}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        await user.click(screen.getByRole('button', {name: 'дальше'}));
        expect(screen.getByRole('heading', {name: 'Третий'})).toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(onFinish).toHaveBeenCalledWith(EMPTY, expect.objectContaining({finish: expect.any(Function)}));
        expect(screen.getByRole('heading', {name: 'Третий'})).toBeInTheDocument();
    });
});

describe('Flow: итоговый экран', () => {
    /** Экран «готово / не вышло»: решает по status, а не по шагу. */
    function Result() {
        const {status} = useFlow<Data>();

        return (
            <div>
                <h1>{status?.ok === true ? 'Готово' : 'Не вышло'}</h1>
                {status?.reason !== undefined && <p data-testid="причина">{String(status.reason)}</p>}
            </div>
        );
    }

    const сИтогом: FlowStep<Data>[] = [...шаги(), {name: 'result', component: Result, result: true}];

    it('итоговый шаг не входит ни в порядок, ни в счётчик', () => {
        render(<Flow steps={сИтогом} initial={EMPTY}/>);

        expect(screen.getByTestId('счёт')).toHaveTextContent('1 из 3');
    });

    it('после удачного onFinish процесс уходит на итоговый экран', async () => {
        const user = userEvent.setup();
        render(<Flow steps={сИтогом} initial={EMPTY} onFinish={() => {}}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        await user.click(screen.getByRole('button', {name: 'дальше'}));
        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(screen.getByRole('heading', {name: 'Готово'})).toBeInTheDocument();
        expect(адрес()).toBe('result');
    });

    it('окончательная неудача из onLeave уводит туда же, но с причиной', async () => {
        const user = userEvent.setup();
        const шагиСПросрочкой: FlowStep<Data>[] = [
            {name: 'one', component: ПЕРВЫЙ, onLeave: (_data, flow) => flow.finish(false, 'заявка просрочена')},
            ...сИтогом.slice(1),
        ];
        render(<Flow steps={шагиСПросрочкой} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(screen.getByRole('heading', {name: 'Не вышло'})).toBeInTheDocument();
        expect(screen.getByTestId('причина')).toHaveTextContent('заявка просрочена');
    });

    it('после finish() процесс дальше не идёт', async () => {
        const user = userEvent.setup();
        const шагиСПросрочкой: FlowStep<Data>[] = [
            {name: 'one', component: ПЕРВЫЙ, onLeave: (_data, flow) => flow.finish(false, 'всё')},
            ...сИтогом.slice(1),
        ];
        render(<Flow steps={шагиСПросрочкой} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(screen.queryByRole('heading', {name: 'Второй'})).toBeNull();
    });

    it('итог убирает черновик: возвращаться некуда', async () => {
        const user = userEvent.setup();
        const шагиСПросрочкой: FlowStep<Data>[] = [
            {name: 'one', component: ПЕРВЫЙ, onLeave: (_data, flow) => flow.finish(false, 'просрочено')},
            ...сИтогом.slice(1),
        ];
        render(<Flow steps={шагиСПросрочкой} initial={EMPTY} draft="черновик"/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        expect(localStorage.getItem('черновик')).toBeNull();

        /*
         * И не возвращается: отложенная запись успевала сработать после
         * finish() и клала черновик обратно — замерено на демо-странице,
         * после «срок заявки истёк» ключ снова оказывался в хранилище.
         */
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(localStorage.getItem('черновик')).toBeNull();
    });

    it('без итогового шага всё как прежде: onFinish отработал, шаг не сменился', async () => {
        const onFinish = vi.fn();
        const user = userEvent.setup();
        render(<Flow steps={шаги()} initial={EMPTY} onFinish={onFinish}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        await user.click(screen.getByRole('button', {name: 'дальше'}));
        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(onFinish).toHaveBeenCalled();
        expect(screen.getByRole('heading', {name: 'Третий'})).toBeInTheDocument();
    });
});

describe('Flow: общая рамка', () => {
    function Frame({children}: {children: React.ReactNode}) {
        const {currentStepIndex, stepsLength, goNextStep} = useFlow<Data>();

        return (
            <div data-testid="рамка">
                <p data-testid="счёт">{currentStepIndex + 1} из {stepsLength}</p>
                {children}
                <button type="button" onClick={goNextStep}>дальше</button>
            </div>
        );
    }

    /** Голый шаг: ни счётчика, ни кнопок — их даёт рамка. */
    function Bare() {
        return <h1>Голый</h1>;
    }

    function Result() {
        const {status} = useFlow<Data>();

        return <h1>{status?.ok === true ? 'Готово' : 'Не вышло'}</h1>;
    }

    it('рамка оборачивает шаг, и шагу остаётся только содержимое', () => {
        render(
            <Flow
                steps={[{name: 'one', component: Bare}, {name: 'two', component: Bare}]}
                initial={EMPTY} layout={Frame}
            />,
        );

        expect(screen.getByTestId('рамка')).toContainElement(screen.getByRole('heading', {name: 'Голый'}));
        expect(screen.getByTestId('счёт')).toHaveTextContent('1 из 2');
    });

    it('кнопки из рамки водят по шагам', async () => {
        const user = userEvent.setup();
        render(
            <Flow
                steps={[{name: 'one', component: ПЕРВЫЙ}, {name: 'two', component: ВТОРОЙ}]}
                initial={EMPTY} layout={Frame}
            />,
        );

        await user.click(screen.getAllByRole('button', {name: 'дальше'})[0]);

        expect(screen.getByRole('heading', {name: 'Второй'})).toBeInTheDocument();
    });

    it('итоговый экран в рамку не заворачивается: процесс кончился', async () => {
        const user = userEvent.setup();
        render(
            <Flow
                steps={[
                    {name: 'one', component: Bare, onLeave: (_data, flow) => flow.finish(false, 'всё')},
                    {name: 'result', component: Result, result: true},
                ]}
                initial={EMPTY} layout={Frame}
            />,
        );

        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(screen.getByRole('heading', {name: 'Не вышло'})).toBeInTheDocument();
        expect(screen.queryByTestId('рамка')).toBeNull();
    });

    it('без рамки всё как прежде', () => {
        const {container} = render(<Flow steps={[{name: 'one', component: Bare}]} initial={EMPTY}/>);

        expect(container.innerHTML).toBe('<h1>Голый</h1>');
    });
});

describe('Flow: черновик', () => {
    it('без ключа не пишется вовсе', async () => {
        const user = userEvent.setup();
        render(<Flow steps={шаги()} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(localStorage.length).toBe(0);
    });

    it('с ключом переживает перезагрузку: и данные, и шаг', async () => {
        const user = userEvent.setup();
        const {unmount} = render(<Flow steps={шаги()} initial={EMPTY} draft="черновик"/>);

        await user.click(screen.getByRole('button', {name: 'переключить'}));
        await user.click(screen.getByRole('button', {name: 'дальше'}));
        await waitFor(() => expect(localStorage.getItem('черновик')).not.toBeNull());

        unmount();
        render(<Flow steps={шаги()} initial={EMPTY} draft="черновик"/>);

        expect(screen.getByRole('heading', {name: 'Второй'})).toBeInTheDocument();
        expect(screen.getByTestId('данные')).toHaveTextContent('"resolved":false');
    });

    it('после завершения черновик убирается', async () => {
        const user = userEvent.setup();
        render(<Flow steps={шаги()} initial={EMPTY} draft="черновик" onFinish={() => {}}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        await user.click(screen.getByRole('button', {name: 'дальше'}));
        await user.click(screen.getByRole('button', {name: 'дальше'}));

        await waitFor(() => expect(localStorage.getItem('черновик')).toBeNull());
    });

    it('испорченный черновик не ломает процесс', () => {
        localStorage.setItem('черновик', 'не json');
        render(<Flow steps={шаги()} initial={EMPTY} draft="черновик"/>);

        expect(screen.getByRole('heading', {name: 'Первый'})).toBeInTheDocument();
    });
});

describe('Flow: ссылка на шаг', () => {
    it('на непройденный шаг не пускает и поправляет адрес', () => {
        window.history.replaceState(null, '', '/?step=three');
        render(<Flow steps={шаги()} initial={EMPTY}/>);

        expect(screen.getByRole('heading', {name: 'Первый'})).toBeInTheDocument();
        expect(адрес()).toBe('one');
    });

    it('на пройденный — пускает: путь помнит черновик', async () => {
        const user = userEvent.setup();
        const {unmount} = render(<Flow steps={шаги()} initial={EMPTY} draft="черновик"/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));
        await waitFor(() => expect(localStorage.getItem('черновик')).not.toBeNull());
        unmount();

        window.history.replaceState(null, '', '/?step=two');
        render(<Flow steps={шаги()} initial={EMPTY} draft="черновик"/>);

        expect(screen.getByRole('heading', {name: 'Второй'})).toBeInTheDocument();
    });

    it('чужое имя в адресе не ломает процесс', () => {
        window.history.replaceState(null, '', '/?step=такого-нет');
        render(<Flow steps={шаги()} initial={EMPTY}/>);

        expect(screen.getByRole('heading', {name: 'Первый'})).toBeInTheDocument();
        expect(адрес()).toBe('one');
    });

    it('чужие параметры адреса не трогаются', async () => {
        const user = userEvent.setup();
        window.history.replaceState(null, '', '/?utm=письмо');
        render(<Flow steps={шаги()} initial={EMPTY}/>);

        await user.click(screen.getByRole('button', {name: 'дальше'}));

        expect(new URLSearchParams(window.location.search).get('utm')).toBe('письмо');
        expect(адрес()).toBe('two');
    });
});

describe('Flow: хук', () => {
    it('вне процесса бросает понятную ошибку', () => {
        const Сам = page('Сам по себе');
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => render(<Сам/>)).toThrow(/только внутри/);

        error.mockRestore();
    });
});
