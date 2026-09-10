/**
 * hook-order — порядок инструкций внутри тела компонента.
 *
 *   0. хуки-значения      useState / useMemo / useRef / useCallback / useContext
 *   1. обычные const      производные значения, объекты пропсов, флаги
 *   2. эффекты            useEffect / useLayoutEffect / useInsertionEffect
 *   3. return             разметка
 *   4. function           бизнес-логика, поднимается хойстингом
 *
 * Правило смотрит только на тела функций, где хуки действительно есть. Иначе
 * оно начинало ругаться на колбэк внутри useLayoutEffect и на хелперы в тестах:
 * там `const` после `function` — нормальный код, а не нарушение конвенции.
 *
 * Автофикса нет намеренно: переставить инструкции местами — значит поменять
 * порядок вычислений, и линтер не может знать, переживёт ли это код.
 */

const EFFECT_HOOKS = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect']);
const RANK_NAMES = ['хуки-значения', 'обычные const', 'эффекты', 'return', 'function'];

const RANK_HOOK = 0;
const RANK_PLAIN = 1;
const RANK_EFFECT = 2;
const RANK_RETURN = 3;
const RANK_FUNCTION = 4;

function calleeName(node) {
    if (!node || node.type !== 'CallExpression') return null;

    return node.callee.type === 'Identifier' ? node.callee.name : null;
}

function rankOf(statement) {
    if (statement.type === 'FunctionDeclaration') return RANK_FUNCTION;
    if (statement.type === 'ReturnStatement') return RANK_RETURN;

    if (statement.type === 'ExpressionStatement') {
        const name = calleeName(statement.expression);

        return name && EFFECT_HOOKS.has(name) ? RANK_EFFECT : RANK_PLAIN;
    }

    if (statement.type === 'VariableDeclaration') {
        const isHook = statement.declarations.some(declarator => {
            const name = calleeName(declarator.init);

            return name !== null && /^use[A-Z]/.test(name);
        });

        return isHook ? RANK_HOOK : RANK_PLAIN;
    }

    return RANK_PLAIN;
}

export const hookOrder = {
    meta: {
        type: 'suggestion',
        docs: {description: 'Порядок инструкций в теле компонента: хуки, const, эффекты, return, function.'},
        schema: [],
        messages: {order: '{{what}} должно идти раньше, чем {{after}}'},
    },
    create(context) {
        function check(node) {
            const body = node.body;
            if (!body || body.type !== 'BlockStatement') return;

            /* Тело без хуков — обычная функция или колбэк: порядок ей не диктуем. */
            const hasHooks = body.body.some(statement => {
                const rank = rankOf(statement);

                return rank === RANK_HOOK
                    || (rank === RANK_EFFECT && statement.type === 'ExpressionStatement');
            });
            if (!hasHooks) return;

            let maxRank = -1;
            let maxRankName = '';

            for (const statement of body.body) {
                const rank = rankOf(statement);

                if (rank < maxRank) {
                    context.report({
                        node: statement,
                        messageId: 'order',
                        data: {what: RANK_NAMES[rank], after: maxRankName},
                    });
                } else if (rank > maxRank) {
                    maxRank = rank;
                    maxRankName = RANK_NAMES[rank];
                }
            }
        }

        return {
            FunctionDeclaration: check,
            FunctionExpression: check,
            ArrowFunctionExpression: check,
        };
    },
};
