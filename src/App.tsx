// App.tsx
import './App.css';
import {useRef, useState, useTransition} from "react";
import {Accordion} from "./components/Accoridon/Accordion.tsx";
import {Alert} from "./components/Alert/Alert.tsx";
import {Button} from "./components/Button/Button.tsx";
import {Checkbox} from "./components/Checkbox/Checkbox.tsx";
import {Dialog} from "./components/Dialog/Dialog.tsx";
import {Dropdown} from "./components/Dropdown/Dropdown.tsx";
import {Fieldset} from "./components/Fieldset/Fieldset.tsx";
import {Popover} from "./components/Popover/Popover.tsx";
import {Radio} from "./components/Radio/Radio.tsx";
import {Select} from "./components/Select/Select.tsx";
import {Switch} from "./components/Switch/Switch.tsx";
import {Toast} from "./components/Toast/Toast.tsx";
import {Tooltip} from "./components/Tooltip/Tooltip.tsx";
import {Typography} from "./components/Typography/Typography.tsx";
import type {AccordionProps} from "./components/Accoridon/Accordion.interface.ts";
import type {AlertProps} from "./components/Alert/Alert.interface.ts";
import type {ButtonProps} from "./components/Button/Button.interface.ts";
import type {DropdownItem} from "./components/Dropdown/Dropdown.interface.ts";
import type {ToastHandle} from "./components/Toast/Toast.interface.ts";


/** Запрос, который падает через раз: нужен только демо-странице. */
let attempt = 0;
function fakeRequest() {
    attempt += 1;

    return new Promise<{ ok: boolean, status: number, message: string }>(resolve => {
        setTimeout(() => resolve(attempt % 2 === 0
            ? {ok: true, status: 200, message: ''}
            : {ok: false, status: 503, message: 'сервис недоступен'}), 300);
    });
}


type Deposit = { value: number, name: string, visibleName: string, closed?: boolean };
type AccordionItem = { summary: string, body: string, attr?: AccordionProps };
type AlertItem = AlertProps;
type ButtonItem = ButtonProps;

const ACCORDION = [
    {
        summary: 'Открытый Accordion',
        body: 'Это контент внутри Body. Он модет быть любой и иметь любые children',
        attr: {
            open: true
        }
    },
    {
        summary: 'Закрытый Accordion',
        body: 'Это контент внутри Body. Он может быть любой и иметь любые children'
    },
    {
        summary: 'Открытый Accordion объедененный в группу',
        body: 'Этот Accordion обхеденен в группу через name - можт быть открыт только один из них',
        attr: {
            open: true,
            name: 'grouped'
        }
    },
    {
        summary: 'Закрытый Accordion объедененный в группу',
        body: 'Этот Accordion обхеденен в группу через name - можт быть открыт только один из них',
        attr: {
            name: 'grouped'
        }
    }
] satisfies AccordionItem[]
const ALERT = [
    {children: 'Base'},
    {children: 'Warning - status', variant: 'WARNING'},
    {children: 'Success - status', variant: 'SUCCESS'},
    {children: 'Error - status', variant: 'ERROR', live: true}
] satisfies AlertItem[]
const BUTTONS = [
    [
        {
            children: 'DEFAULT',
            variant: 'DEFAULT'
        },
        {
            children: 'OUTLINE',
            variant: 'OUTLINE'
        },
        {
            children: 'CONTRAST',
            variant: 'CONTRAST'
        },
        {
            children: 'INLINE',
            variant: 'INLINE'
        }
    ],
    [
        {
            children: 'DEFAULT',
            variant: 'DEFAULT',
            loading: true
        },
        {
            children: 'OUTLINE',
            variant: 'OUTLINE',
            loading: true
        },
        {
            children: 'CONTRAST',
            variant: 'CONTRAST',
            loading: true
        },
        {
            children: 'INLINE',
            variant: 'INLINE',
            loading: true
        }
    ],
    [
        {
            children: 'DEFAULT',
            variant: 'DEFAULT',
            disabled: true
        },
        {
            children: 'OUTLINE',
            variant: 'OUTLINE',
            disabled: true
        },
        {
            children: 'CONTRAST',
            variant: 'CONTRAST',
            disabled: true
        },
        {
            children: 'INLINE',
            variant: 'INLINE',
            disabled: true
        }
    ]

] satisfies ButtonItem[][]
const DROPDOWN = [
    {label: 'Копировать', iconStart: '⧉', iconEnd: '⌘C', onSelect: () => console.log('copy')},
    {label: 'Переименовать', onSelect: () => console.log('rename')},
    {label: 'Открыть в новой вкладке', href: '#DROPDOWN', target: '_blank', iconEnd: '↗'},
    {label: 'Архивировать', disabled: true},
    {label: 'Удалить', danger: true, separator: 'before', onSelect: () => console.log('delete')},
] satisfies DropdownItem[]
const CURRENCIES = ['Рубль', 'Доллар', 'Евро', 'Юань'];
const DEPOSITS = [
    {value: 1, name: 'safe', visibleName: 'Надёжный'},
    {value: 2, name: 'kids', visibleName: 'Детский'},
    {value: 3, name: 'save', visibleName: 'Накопительный'},
    {value: 4, name: 'old', visibleName: 'Архивный', closed: true},
] satisfies Deposit[];
const TOAST_BACKGROUND = [
    'Не удалось синхронизировать черновик',
    'Файл «договор.pdf» не загрузился',
    'Курс валют устарел: показываем вчерашний',
];


/* eslint-disable local/hook-order */
function App() {
    /*  DIALOG  */
    const [dialog, setDialog] = useState<'firstType' | null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const close = () => setDialog(null)

    /*  SELECT  */
    const [currencies, setCurrencies] = useState<string[]>([]);

    /*  POPOVER */
    const popoverRef = useRef<HTMLDivElement>(null);

    /*  TOAST  */
    const [saving, startSaving] = useTransition();
    const toastRef = useRef<ToastHandle>(null);
    const noticeRef = useRef<ToastHandle>(null);

    function save() {
        startSaving(async () => {
            const response = await fakeRequest();

            if (response.ok) {
                toastRef.current?.show('Сохранено', {variant: 'SUCCESS'});
                return;
            }
            toastRef.current?.show(`Ошибка ${response.status}: ${response.message}`, {variant: 'ERROR'});
        });
    }

    return (
        <>
            <main className='content'>
                <section id={'ACCORDION'} className='section'>
                    <Typography as={'h2'}>ACCORDION</Typography>
                    {ACCORDION.map((item, index) => (
                        <Accordion {...item.attr} key={index}>
                            <Accordion.Header>{item.summary}</Accordion.Header>
                            <Accordion.Content>{item.body}</Accordion.Content>
                        </Accordion>
                    ))}
                </section>
                <section id={'ALERT'} className='section'>
                    <Typography as={'h2'}>ALERT</Typography>
                    {ALERT.map((item, index) => (
                        <Alert {...item} key={index}/>
                    ))}
                </section>
                <section id={'BUTTON'} className='section'>
                    <Typography as={'h2'}>BUTTONS</Typography>
                    {BUTTONS.map((item, index) => (
                        <div className="block" key={index}>
                            {item.map(button => (
                                <Button {...button} key={button.variant}/>
                            ))}
                        </div>
                    ))}
                </section>
                <section id={'DIALOG'} className="section">
                    <Typography as={'h2'}>DIALOG</Typography>
                    <div className="block">
                        <Button onClick={() => setDialog('firstType')}>Открыть первое окно</Button>
                        <Button onClick={() => dialogRef.current?.showModal()}>Открыть второе окно</Button>
                        <Button commandfor="threeType" command="show-modal">Открыть третье окно</Button>
                    </div>
                </section>
                <section id={'POPOVER'} className="section">
                    <Typography as={'h2'}>POPOVER</Typography>
                    <div className="block">
                        <Button popoverTarget={'auto_popover'} variant={'OUTLINE'}>
                            Снизу, закрытие браузером
                        </Button>
                        <Button popoverTarget={'side_popover'} variant={'OUTLINE'}>
                            Сбоку, закрытие кнопкой
                        </Button>
                        <Button popoverTarget={'manual_popover'} variant={'OUTLINE'}>
                            Ручной, закрытие через ref
                        </Button>
                    </div>
                </section>
                <section id={'DROPDOWN'} className="section">
                    <Typography as={'h2'}>DROPDOWN</Typography>
                    <div className="block">
                        <Dropdown trigger="Действия" items={DROPDOWN}/>
                        <Dropdown trigger="Сбоку" items={DROPDOWN} placement={'inline-end'}
                                  triggerProps={{variant: 'OUTLINE'}}/>
                        <Dropdown trigger="⋯" items={DROPDOWN}
                                  triggerProps={{variant: 'CONTRAST', 'aria-label': 'Ещё'}}/>
                        <Dropdown items={DROPDOWN}>
                            <Button variant={'OUTLINE'}><span aria-hidden="true">☰</span> Кастомный триггер</Button>
                        </Dropdown>
                    </div>
                </section>
                <section id={'SELECT'} className="section">
                    <Typography as={'h2'}>SELECT</Typography>

                    <Typography as={'h3'} variant={'note'}>Один: массив строк</Typography>
                    <div className="block">
                        <Select label={'Выберите валюту'} name={'currency'} items={CURRENCIES}/>
                    </div>

                    <Typography as={'h3'} variant={'note'}>Один: объекты с ключами</Typography>
                    <div className="block">
                        <Select
                            label={'Выберите вид депозита'}
                            name={'deposit'}
                            items={DEPOSITS}
                            itemLabel={'visibleName'}
                            itemValue={'value'}
                            itemDisabled={'closed'}
                            defaultValue={1}
                        />
                    </div>

                    <Typography as={'h3'} variant={'note'}>Один: своя разметка пункта</Typography>
                    <div className="block">
                        <Select
                            label={'Выберите вид депозита'}
                            items={DEPOSITS}
                            itemValue={'value'}
                            itemLabel={(item) => item.visibleName}
                            itemRender={(item) => (
                                <>
                                    <span aria-hidden="true">★</span>{' '}
                                    {item.visibleName}{' '}
                                    <Typography as={'span'} variant={'caption'} aria-hidden="true">
                                        {item.name}
                                    </Typography>
                                </>
                            )}
                        />
                    </div>

                    <Typography as={'h3'} variant={'note'}>Несколько: массив строк</Typography>
                    <div className="block">
                        <Select
                            variant={'multi'}
                            label={'Выберите валюты'}
                            name={'currencies'}
                            items={CURRENCIES}
                            defaultValue={['Рубль']}
                        />
                    </div>

                    <Typography as={'h3'} variant={'note'}>Несколько: объекты с ключами</Typography>
                    <div className="block">
                        <Select
                            variant={'multi'}
                            label={'Выберите виды депозита'}
                            name={'deposits'}
                            items={DEPOSITS}
                            itemLabel={'visibleName'}
                            itemValue={'value'}
                            itemDisabled={'closed'}
                        />
                    </div>

                    <Typography as={'h3'} variant={'note'}>Несколько: управляемый снаружи</Typography>
                    <div className="block">
                        <Select
                            variant={'multi'}
                            label={'Выберите валюты'}
                            items={CURRENCIES}
                            value={currencies}
                            onChange={setCurrencies}
                        />
                        <Typography variant={'note'}>
                            {currencies.length ? `Выбрано: ${currencies.join(', ')}` : 'Пока ничего не выбрано'}
                        </Typography>
                    </div>
                </section>
                <section id={'TOOLTIP'} className="section">
                    <Typography as={'h2'}>TOOLTIP</Typography>
                    <div className="block">
                        <Tooltip text="Наведение сработало, теперь убери курсор">
                            <div style={{padding: 12, borderRadius: 8, backgroundColor: 'var(--base-color-200)'}}>Наведи
                                курсор на тултип
                            </div>
                        </Tooltip>
                        <Tooltip text="Кнопка в состоянии disabled">
                            <Button variant={'CONTRAST'} disabled>Наведи курсор на нопку
                            </Button>
                        </Tooltip>
                    </div>
                </section>
                <section id={'CHECKBOX'} className="section">
                    <Typography as={'h2'}>CHECKBOX</Typography>
                    <div className="block">
                        <Checkbox name="news" value="yes" defaultChecked>Присылать новости</Checkbox>
                        <Checkbox name="terms" value="yes">Согласен с условиями</Checkbox>
                        <Checkbox disabled>Недоступно</Checkbox>
                    </div>
                    <div className="block">
                        <Checkbox variant={'CHIP'} name="news" value="yes" defaultChecked>Присылать новости</Checkbox>
                        <Checkbox variant={'CHIP'} name="terms" value="yes">Согласен с условиями</Checkbox>
                        <Checkbox variant={'CHIP'} disabled>Недоступно</Checkbox>
                    </div>
                </section>
                <section id={'RADIO'} className="section">
                    <Typography as={'h2'}>RADIO</Typography>
                    <div className="block">
                        <Radio name="base" value="free" defaultChecked>Бесплатный</Radio>
                        <Radio name="base" value="pro">Профессиональный</Radio>
                        <Radio name="base" value="team">Командный</Radio>
                    </div>
                    <div className="block">
                        <Radio variant={'CHIP'} name="plan" value="free" defaultChecked>Бесплатный</Radio>
                        <Radio variant={'CHIP'} name="plan" value="pro">Профессиональный</Radio>
                        <Radio variant={'CHIP'} name="plan" value="team">Командный</Radio>
                    </div>
                </section>
                <section id={'SWITCH'} className="section">
                    <Typography as={'h2'}>SWITCH</Typography>
                    <div className="block">
                        <Switch name="notify" value="yes" defaultChecked>Уведомления по почте</Switch>
                        <Switch name="theme" value="dark">Тёмная тема</Switch>
                        <Switch disabled>Недоступно</Switch>
                    </div>
                </section>
                <section id={'FIELDSET'} className="section">
                    <Typography as={'h2'}>FIELDSET</Typography>
                    <Fieldset legend="Тариф" role="radiogroup">
                        <Radio name="plan" value="free">Бесплатный</Radio>
                        <Radio name="plan" value="pro">Профессиональный</Radio>
                    </Fieldset>
                    <Fieldset legend="Способ оплаты">
                        <Checkbox name={'tip'} value="card">Картой</Checkbox>
                        <Checkbox name={'tip'} value="disc">Наличными</Checkbox>
                    </Fieldset>
                    <Fieldset legend="Способ оплаты">
                        <Button>Картой</Button>
                        <Button>Наличными</Button>
                    </Fieldset>
                </section>
                <section id={'TOAST'} className="section">
                    <Typography as={'h2'}>TOAST</Typography>
                    <div className="block">
                        <Button onClick={save} loading={saving}>Сохранить (запрос через раз падает)</Button>
                        <Button variant={'OUTLINE'}
                                onClick={() => TOAST_BACKGROUND.forEach(
                                    text => toastRef.current?.show(text, {variant: 'ERROR'}),
                                )}>
                            Три независимых отказа
                        </Button>
                        <Button variant={'OUTLINE'}
                                onClick={() => noticeRef.current?.show(
                                    'Другая область: свой угол и свой таймер', {duration: 10000},
                                )}>
                            Другой угол, 10 секунд
                        </Button>
                    </div>
                </section>
            </main>


            {/*  DIALOG   */}
            <>
                <Dialog open={dialog === 'firstType'} onClose={close} label="Первое окно">
                    <Typography as={'h2'}>Это первое окно для модалки открыто через state.</Typography>
                    <form method="dialog"><Button type="submit">Закрытие через форму</Button></form>
                </Dialog>
                <Dialog ref={dialogRef} label="Второе окно">
                    <Typography as={'h2'}>Это второе окно для модалки открыто через ref</Typography>
                    <Button onClick={() => dialogRef.current?.close()}>Закрыть через ref</Button>
                </Dialog>
                <Dialog id="threeType" label="Третье окно">
                    <Typography as={'h2'}>Это третье окно для модалки открыто нативно</Typography>
                    <Button commandfor="threeType" command="close">Закрытие через кнопку</Button>
                </Dialog>
            </>
            {/*  TOAST   */}
            <>
                <Toast ref={toastRef} position="BOTTOM_END" duration={5000}/>
                <Toast ref={noticeRef} position="TOP_START"/>
            </>
            {/*  POPOVER   */}
            <>
                <Popover id={'auto_popover'} label={'Базовый auto popover'}>
                    <Typography as={'p'}>popover="auto": Esc и клик мимо закрывают его сами,
                        фокус возвращается на кнопку. JS не написано ни строчки.</Typography>
                </Popover>
                <Popover id={'side_popover'} label={'Поповер сбоку inline-end позиция'} placement={'inline-end'}>
                    <Typography as={'p'}>placement="inline-end" ставит его справа от кнопки.
                        Если справа не хватит места, браузер сам перевернёт его влево.</Typography>
                    <Button popoverTarget={'side_popover'} popoverTargetAction={'hide'}>
                        Закрыть
                    </Button>
                </Popover>
                <Popover id={'manual_popover'} label={'Ручной поповер через ref'} popover={'manual'} ref={popoverRef}>
                    <Typography as={'p'}>popover="manual" не реагирует ни на Esc, ни на клик мимо
                        и не закрывается при открытии соседнего. Закрыть его можно
                        только программно.</Typography>
                    <Button onClick={() => popoverRef.current?.hidePopover()}>Закрыть через ref</Button>
                </Popover>
            </>
        </>
    );


}

export default App