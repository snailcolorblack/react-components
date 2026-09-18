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

/*
 * jsdom не реализует Popover API вообще: ни showPopover/hidePopover,
 * ни свойство popover, ни реакцию на popovertarget. Заглушка повторяет
 * только наблюдаемую часть контракта:
 *
 *   — popover как свойство, отражающее атрибут;
 *   — showPopover / hidePopover / togglePopover с событиями beforetoggle
 *     и toggle;
 *   — клик по [popovertarget] с учётом popovertargetaction;
 *   — видимость: в jsdom к [popover] применяется display: none, и без
 *     этого содержимое открытого поповера оставалось бы скрытым от
 *     getByRole и axe. В браузере то же самое делает UA-правило, которое
 *     перестаёт действовать при :popover-open.
 *
 * Чего здесь намеренно НЕТ: закрытия по Esc и по клику мимо, вытеснения
 * одного auto-поповера другим, top layer, перехода фокуса внутрь по Tab.
 * Это поведение браузера, и подделывать его в тестах — значит проверять
 * собственную выдумку. Оно измеряется в настоящем Chromium.
 */
if (typeof HTMLElement !== 'undefined' && !('showPopover' in HTMLElement.prototype)) {
    const openPopovers = new WeakSet<HTMLElement>();
    /*
     * Проверка выше сужает HTMLElement.prototype до never: с точки зрения
     * типов эти методы у него уже есть, отсутствуют они только в рантайме
     * jsdom. Отдельная ссылка возвращает нормальный тип.
     */
    const proto = HTMLElement.prototype as HTMLElement;

    Object.defineProperty(HTMLElement.prototype, 'popover', {
        configurable: true,
        get(this: HTMLElement) {
            return this.getAttribute('popover');
        },
        set(this: HTMLElement, value: string | null) {
            if (value === null) this.removeAttribute('popover');
            else this.setAttribute('popover', value);
        },
    });

    function fire(element: HTMLElement, type: string, oldState: string, newState: string) {
        const event = new Event(type, {cancelable: type === 'beforetoggle'});
        Object.assign(event, {oldState, newState});

        return element.dispatchEvent(event);
    }

    proto.showPopover = function showPopover(this: HTMLElement) {
        if (openPopovers.has(this)) return;
        if (!fire(this, 'beforetoggle', 'closed', 'open')) return;
        openPopovers.add(this);
        this.style.display = 'block';
        fire(this, 'toggle', 'closed', 'open');
    };

    proto.hidePopover = function hidePopover(this: HTMLElement) {
        if (!openPopovers.has(this)) return;
        if (!fire(this, 'beforetoggle', 'open', 'closed')) return;
        openPopovers.delete(this);
        this.style.removeProperty('display');
        fire(this, 'toggle', 'open', 'closed');
    };

    proto.togglePopover = function togglePopover(this: HTMLElement, force?: boolean) {
        const open = openPopovers.has(this);
        if (force === true || (force === undefined && !open)) this.showPopover();
        else this.hidePopover();

        return openPopovers.has(this);
    };

    /*
     * :popover-open в jsdom неизвестен и роняет matches(). Подменяем только
     * его, всё остальное отдаём исходной реализации — чтобы тесты писались
     * тем же селектором, что и настоящий код.
     */
    const nativeMatches = Element.prototype.matches;
    Element.prototype.matches = function matches(this: Element, selector: string) {
        if (selector === ':popover-open') return openPopovers.has(this as HTMLElement);

        return nativeMatches.call(this, selector);
    };

    /* Кнопка с popovertarget переключает цель. */
    document.addEventListener('click', event => {
        const target = event.target as Element | null;
        const invoker = target?.closest?.('[popovertarget]') as HTMLElement | null;
        if (!invoker) return;

        const popover = document.getElementById(invoker.getAttribute('popovertarget') ?? '');
        if (!popover) return;

        const action = invoker.getAttribute('popovertargetaction') ?? 'toggle';
        if (action === 'show') popover.showPopover();
        else if (action === 'hide') popover.hidePopover();
        else popover.togglePopover();
    });
}
