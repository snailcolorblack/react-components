import {RuleTester} from 'eslint';
import {describe, expect, it} from 'vitest';
import {hookOrder} from './hook-order.js';

/*
 * Правило уже дважды ошибалось: сначала ругалось на колбэки внутри эффектов,
 * потом ставило предупреждение на return вместо функции, которую нужно
 * двигать. Эти случаи здесь и закреплены.
 *
 * JSX в примерах нет намеренно: правило работает с порядком инструкций,
 * а не с разметкой, и обходится без парсера TypeScript.
 */

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
    languageOptions: {ecmaVersion: 2022, sourceType: 'module'},
});

ruleTester.run('hook-order', hookOrder, {
    valid: [
        {
            name: 'правильный порядок целиком',
            code: `
                function C() {
                    const [v, setV] = useState(0);
                    const ref = useRef(null);
                    const doubled = v * 2;
                    useEffect(() => { setV(1); }, []);

                    return doubled;

                    function helper() { return v; }
                }
            `,
        },
        {
            name: 'функция после return — так и задумано',
            code: `
                function C() {
                    const [v] = useState(0);

                    return v;

                    function helper() { return v; }
                }
            `,
        },
        {
            name: 'тело без хуков порядку не подчиняется',
            code: `
                function helper() {
                    const a = 1;
                    function inner() { return a; }

                    return inner();
                }
            `,
        },
        {
            name: 'колбэк эффекта: const после function — норма',
            code: `
                function C() {
                    const ref = useRef(null);
                    useLayoutEffect(() => {
                        function place() { return ref.current; }
                        const observer = new ResizeObserver(place);
                        observer.observe(document.body);

                        return () => observer.disconnect();
                    }, []);

                    return ref;
                }
            `,
        },
        {
            name: 'однострочная стрелка в const — обычная переменная, не хук',
            code: `
                function C() {
                    const [v, setV] = useState(0);
                    const close = () => setV(null);

                    return close;
                }
            `,
        },
    ],
    invalid: [
        {
            name: 'хук после обычной переменной',
            code: `
                function C() {
                    const [v] = useState(0);
                    const plain = v + 1;
                    const ref = useRef(null);

                    return plain;
                }
            `,
            errors: [{messageId: 'order', data: {what: 'хуки-значения', after: 'обычные const'}}],
        },
        {
            name: 'эффект раньше обычной переменной',
            code: `
                function C() {
                    const [v] = useState(0);
                    useEffect(() => {}, []);
                    const plain = v + 1;

                    return plain;
                }
            `,
            errors: [{messageId: 'order'}],
        },
        {
            name: 'функция перед return: помечается функция, а не return',
            code: `
                function C() {
                    const [v] = useState(0);
                    function helper() { return v; }

                    return helper();
                }
            `,
            errors: [{messageId: 'afterReturn', line: 4, column: 30}],
        },
        {
            name: 'две функции перед return — обе',
            code: `
                function C() {
                    const [v] = useState(0);
                    function first() { return v; }
                    function second() { return v; }

                    return first() + second();
                }
            `,
            errors: [{messageId: 'afterReturn'}, {messageId: 'afterReturn'}],
        },
    ],
});

describe('hook-order: сообщения', () => {
    it('про функцию говорит, что двигать нужно её', () => {
        expect(hookOrder.meta.messages.afterReturn).toContain('после return');
    });
});
