// Flow.tsx

/* -------------------------------------------------------------------------- */
/*  ПРОЦЕСС НА НЕСКОЛЬКО СТРАНИЦ                                              */
/*                                                                            */
/*  Анкета, заявка, оформление — один набор данных, разложенный по шагам.     */
/*  Flow держит данные, порядок шагов и текущее место; шаги читают всё это    */
/*  через useFlow() и ничего друг о друге не знают.                           */
/*                                                                            */
/*  Чего здесь нет намеренно: проверки значений. Их делает onLeave у шага —   */
/*  любой библиотекой, какая нравится, или вручную. Там же шаг уходит         */
/*  на сервер. Flow только ждёт результат и решает, пускать ли дальше.        */
/* -------------------------------------------------------------------------- */

/* --- Как пишется ---------------------------------------------------------- */
/*
 *  const STEPS = [
 *      {name: 'resolved', component: Resolved},
 *      {name: 'quality', component: Quality, when: data => data.resolved},
 *      {name: 'comment', component: Comment, onLeave: send},
 *  ];
 *
 *  <Flow steps={STEPS} initial={EMPTY} draft="survey" onFinish={send}/>
 *
 *  Шаг внутри:
 *
 *  const {data, setData, goNextStep, pending} = useFlow<SurveyData>();
 */

/* --- Что делает браузер, а что мы ----------------------------------------- */
/*
 *  Браузер:
 *      историю шагов. Шаг лежит в адресе (?step=quality), переход вперёд —
 *      pushState, поэтому «назад» и «вперёд» у браузера и жест назад
 *      на телефоне работают сами. Перезагрузка не выбрасывает в начало,
 *      ссылку на шаг можно скопировать.
 *
 *  Мы:
 *      порядок с пропусками, данные, ожидание onLeave и черновик.
 */

/* --- Куда пускает ссылка -------------------------------------------------- */
/*
 *  Только на пройденное. Адрес — это строка, и в ней может оказаться
 *  что угодно: чужой шаг, старое имя, середина процесса с пустыми
 *  данными. Поэтому имя из адреса принимается, только если шаг виден
 *  при нынешних данных и уже был пройден; иначе процесс молча
 *  встаёт на первый шаг и поправляет адрес через replaceState,
 *  не оставляя в истории записи, по которой «назад» вернуло бы
 *  на несуществующее место.
 *
 *  Пройденное помнит черновик. Без него перезагрузка начинает процесс
 *  заново — данных всё равно нет.
 */
/* -------------------------------------------------------------------------- */

import {createElement, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlowContext} from './Flow.context.ts';
import {dropDraft, readDraft, writeDraft} from './Flow.draft.ts';
import {onUrlStep, stepFromUrl, stepToUrl} from './Flow.url.ts';
import type {FlowProps, FlowResult, FlowState, FlowStep, FlowTools} from './Flow.interface.ts';

/* Сколько ждём тишины, прежде чем писать черновик. Запись в localStorage
   синхронная, и на каждую букву делать её незачем. */
const DRAFT_DELAY = 300;

function Flow<T extends object>({
                                    steps,
                                    initial,
                                    draft,
                                    param = 'step',
                                    onFinish,
                                    onStepChange,
                                    layout: Layout,
                                    fallback = null,
                                }: FlowProps<T>) {

    /*
     * Начальное место считается один раз и ДО первой отрисовки: черновик,
     * адрес и порядок шагов известны сразу, и выбирать есть из чего уже
     * здесь. Через эффект получалось бы иначе — первый шаг успевал
     * мелькнуть поверх восстановленного, а в истории оставалась лишняя
     * запись, по которой «назад» возвращало в никуда.
     */
    const [begin] = useState(() => start(steps, initial, draft, param));
    const [data, setData] = useState<T>(begin.data);
    const [name, setName] = useState<string | undefined>(begin.name);
    const [reached, setReached] = useState<string[]>(begin.reached);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<unknown>(undefined);
    const [status, setStatus] = useState<FlowResult | undefined>(undefined);
    /*
     * Зеркало данных для асинхронных переходов: пока идёт onLeave,
     * состояние в замыкании успевает устареть, а решать, какой шаг
     * следующий, нужно по самым свежим данным. Пишется эффектом —
     * трогать ref во время отрисовки нельзя.
     */
    const latest = useRef(data);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    /* Внутри колбэка могли позвать finish(). Тогда переходить дальше
       уже некуда: процесс закончился. */
    const over = useRef(false);
    /* Видимые шаги при нынешних данных. Пропущенные не участвуют
       ни в порядке, ни в счётчике «шаг 2 из 5». */
    const visible = useMemo(
        () => steps.filter(step => step.result !== true && (step.when === undefined || step.when(data))),
        [steps, data],
    );
    /* Итоговый экран. В порядок не входит: это не часть пути, а его конец. */
    const terminal = useMemo(() => steps.find(step => step.result === true), [steps]);
    const land = useCallback(function land(to: FlowStep<T> | undefined, replace: boolean) {
        if (to === undefined) return;

        setName(to.name);
        setReached(was => (was.includes(to.name) ? was : [...was, to.name]));
        stepToUrl(param, to.name, replace);
        onStepChange?.(to.name, latest.current);
    }, [param, onStepChange]);

    const first = visible[0];
    /*
     * Шаг может исчезнуть из видимых — так бывает, когда вернулись назад
     * и поменяли ответ, от которого зависит when. Тогда findIndex даст -1,
     * и процесс сам отступает на первый видимый: отдельного эффекта
     * с переносом для этого не нужно, достаточно посчитать здесь.
     */
    const index = Math.max(visible.findIndex(step => step.name === name), 0);
    /* На итоговом экране счётчик ничего не значит: там смотрят status. */
    const step = (name === terminal?.name ? terminal : undefined) ?? visible[index] ?? first;
    const tools: FlowTools<T> = {finish, setData};
    const value: FlowState<T> = {
        step,
        currentStepIndex: index,
        stepsLength: visible.length,
        data,
        setData,
        goNextStep,
        goPrevStep,
        goToStep,
        pending,
        error,
        isFirst: index === 0,
        isLast: index === visible.length - 1,
        status,
        finish,
        clearDraft: () => dropDraft(draft),
    };

    useEffect(() => {
        latest.current = data;
    }, [data]);

    /*
     * Адрес обязан показывать тот шаг, который виден. Этим одним правилом
     * закрываются сразу три случая: первая отрисовка, чужое или устаревшее
     * имя в адресе и шаг, пропавший из видимых. Всегда replaceState:
     * записи о месте, где процесс не стоит, в истории быть не должно.
     */
    useEffect(() => {
        if (step === undefined) return;
        if (stepFromUrl(param) === step.name) return;

        stepToUrl(param, step.name, true);
    }, [param, step]);

    /* Кнопки «назад» и «вперёд» у браузера. */
    useEffect(() => onUrlStep(param, asked => {
        const to = visible.find(item => item.name === asked && reached.includes(item.name));

        /*
         * Ушли из процесса (чужой адрес или шаг, которого больше нет) —
         * возвращаем на текущий, заменяя запись: иначе «назад» зацикливается
         * между чужим адресом и нашим.
         */
        if (to === undefined) stepToUrl(param, step.name, true);
        else {
            setName(to.name);
            onStepChange?.(to.name, latest.current);
        }
    }), [param, visible, reached, step, onStepChange]);

    /*
     * Черновик. Пишется с задержкой и только если ключ дали.
     *
     * Законченный процесс не пишется вовсе, и это не мелочь: finish()
     * черновик убирает, но отложенная запись успевала сработать после
     * него и возвращала его обратно — замерено на демо-странице, после
     * «срок заявки истёк» ключ снова оказывался в хранилище. Смена
     * status снимает отложенную запись вместе со старым эффектом.
     */
    useEffect(() => {
        if (draft === undefined || name === undefined || status !== undefined) return;

        clearTimeout(timer.current);
        timer.current = setTimeout(() => writeDraft(draft, {data, step: name, reached}), DRAFT_DELAY);

        return () => clearTimeout(timer.current);
    }, [draft, data, name, reached, status]);

    /* Видимых шагов не осталось — показывать нечего.
       Контекст один на все процессы, а данные у каждого свои: тип
       возвращает useFlow<T>() на месте вызова. */
    /*
     * Общая рамка оборачивает шаги, но не итоговый экран: процесс там
     * кончился, и ни счётчика, ни «дальше» на нём быть не должно.
     */
    return step === undefined
        ? <>{fallback}</>
        : (
            <FlowContext.Provider value={value as unknown as FlowState}>
                {Layout === undefined || step.result === true
                    ? createElement(step.component)
                    : <Layout>{createElement(step.component)}</Layout>}
            </FlowContext.Provider>
        );

    async function goNextStep() {
        /* Повторное нажатие, пока идёт запрос, — не второй переход. */
        if (pending) return false;

        setError(undefined);

        const current = step;
        const last = index === visible.length - 1;

        over.current = false;

        /*
         * Сначала onLeave шага, потом onFinish процесса — и на последнем
         * шаге тоже. Они про разное: onLeave сохраняет и проверяет этот
         * шаг, onFinish завершает всё. Пока onFinish вытеснял onLeave,
         * последний шаг молча терял свою отправку (поймано тестом).
         */
        if (current.onLeave !== undefined || (last && onFinish !== undefined)) {
            setPending(true);

            try {
                /* false — «проверка не прошла»: это не ошибка, показывать
                   её будет сам шаг. Остальное считаем согласием. */
                if (current.onLeave !== undefined && await current.onLeave(latest.current, tools) === false) {
                    return false;
                }
                /* onLeave мог закончить процесс сам — завершать нечего. */
                if (!over.current && last && onFinish !== undefined) await onFinish(latest.current, tools);
            } catch (reason) {
                setError(reason);

                return false;
            } finally {
                setPending(false);
            }
        }

        /* Колбэк позвал finish() — он сам решил, чем всё кончилось. */
        if (over.current) return true;

        if (last) {
            /* Процесс дошёл до конца. Есть итоговый экран — уходим туда,
               нет — остаёмся на месте, как и раньше. */
            if (terminal !== undefined) finish(true);
            else dropDraft(draft);

            return true;
        }

        /* Порядок считается по свежим данным: onLeave мог их поменять. */
        const after = steps.filter(item => item.when === undefined || item.when(latest.current));
        const at = after.findIndex(item => item.name === current.name);

        land(after[at + 1] ?? after.at(-1), false);

        return true;
    }

    function goPrevStep() {
        if (index === 0) return;

        setError(undefined);

        /*
         * Через историю браузера, а не своим переходом: запись о текущем
         * шаге уже лежит в ней, и своим pushState мы бы положили вторую.
         * Тогда «назад» у браузера пришлось бы жать дважды.
         */
        if (typeof window !== 'undefined' && window.history.state?.flowStep === step.name) {
            window.history.back();

            return;
        }

        land(visible[index - 1], false);
    }

    /**
     * Закончить процесс. Черновик при этом убирается в любом случае:
     * и после «готово», и после «не вышло» возвращаться уже некуда.
     *
     * Запись истории заменяется, а не добавляется: «назад» с итогового
     * экрана должно уводить со страницы, а не внутрь законченного
     * процесса, где данных уже нет.
     */
    function finish(ok: boolean, reason?: unknown) {
        over.current = true;
        setStatus({ok, reason});
        setError(undefined);
        dropDraft(draft);

        if (terminal === undefined) return;

        setName(terminal.name);
        stepToUrl(param, terminal.name, true);
        onStepChange?.(terminal.name, latest.current);
    }

    function goToStep(to: string) {
        const target = visible.find(item => item.name === to);

        /* Только назад по пройденному: вперёд идут через goNextStep,
           иначе проверки и отправка шагов остались бы в стороне. */
        if (target === undefined || !reached.includes(to)) return;

        setError(undefined);
        land(target, false);
    }
}

/**
 * С чего процесс начинается: данные, шаг и пройденный путь.
 *
 * Имя из адреса принимается, только если шаг виден при этих данных
 * и уже был пройден. Иначе — первый видимый: в адресе может оказаться
 * что угодно, а середина процесса с пустыми данными смысла не имеет.
 */
function start<T extends object>(steps: FlowStep<T>[], initial: T, draft: string | undefined, param: string) {
    const saved = readDraft<T>(draft);
    const data = saved?.data ?? initial;
    const visible = steps.filter(step => step.when === undefined || step.when(data));
    const asked = stepFromUrl(param) ?? saved?.step;
    const allowed = visible.find(step => step.name === asked && (saved?.reached.includes(step.name) ?? false));
    const name = (allowed ?? visible[0])?.name;
    const reached = saved?.reached ?? [];

    return {
        data,
        name,
        reached: name !== undefined && !reached.includes(name) ? [...reached, name] : reached,
    };
}

export {Flow};
