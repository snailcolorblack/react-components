/* -------------------------------------------------------------------------- */
/*  commandfor там, где его нет                                               */
/*                                                                            */
/*  Основной путь — сам атрибут: <button commandfor command> браузер          */
/*  исполняет без единой строки JS. В движках без Invoker Commands            */
/*  (Firefox < 144, Safari < 26.2) такая кнопка молча ничего не делала,       */
/*  и диалог, открытый только ею, не открывался вовсе. Здесь то же самое      */
/*  поведение теми же родными вызовами, ровно для этих движков.               */
/* -------------------------------------------------------------------------- */

const NATIVE = typeof window === 'undefined' || 'CommandEvent' in window;

function runCommand(command: string | undefined, id: string | undefined, source: HTMLElement) {
    if (NATIVE || !command || !id) return;

    const target = document.getElementById(id);

    if (target === null) return;

    if (command.startsWith('--')) {
        target.dispatchEvent(Object.assign(new Event('command', {cancelable: true}), {command, source}));

        return;
    }

    if (target instanceof HTMLDialogElement) {
        if (command === 'show-modal' && !target.open) target.showModal();
        if (command === 'close' && target.open) target.close();
        if (command === 'request-close' && target.open) {
            if (target.requestClose) target.requestClose();
            else target.close();
        }

        return;
    }

    if (command === 'toggle-popover') target.togglePopover();
    if (command === 'show-popover' && !target.matches(':popover-open')) target.showPopover();
    if (command === 'hide-popover' && target.matches(':popover-open')) target.hidePopover();
}

export {runCommand};
