import '@testing-library/jest-dom/vitest'

/*
 * В jsdom нет ResizeObserver, а сегментированный контрол наблюдает за
 * шириной сегментов. Заглушка ничего не измеряет — геометрия проверяется
 * в браузере, здесь тестируется только логика.
 */
if (!('ResizeObserver' in globalThis)) {
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
}

/*
 * jsdom не реализует showModal/close у <dialog>. Заглушка повторяет только
 * наблюдаемую часть контракта: атрибут open и событие close. Настоящую
 * модальность — top layer, ловушку фокуса, ::backdrop — проверяем в браузере.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.show = function show() {
        this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close(returnValue?: string) {
        if (!this.hasAttribute('open')) return;
        this.removeAttribute('open');
        if (returnValue !== undefined) this.returnValue = returnValue;
        this.dispatchEvent(new Event('close'));
    };
}
