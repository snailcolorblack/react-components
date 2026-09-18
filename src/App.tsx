// App.tsx
import './App.css';
import {useRef, useState} from "react";
import {Accordion} from "./components/Accoridon/Accordion.tsx";
import {Alert} from "./components/Alert/Alert.tsx";
import {Button} from "./components/Button/Button.tsx";
import {Checkbox} from "./components/Checkbox/Checkbox.tsx";
import {Dialog} from "./components/Dialog/Dialog.tsx";
import {Fieldset} from "./components/Fieldset/Fieldset.tsx";
import {Popover} from "./components/Popover/Popover.tsx";
import {Radio} from "./components/Radio/Radio.tsx";
import {Tooltip} from "./components/Tooltip/Tooltip.tsx";
import {Typography} from "./components/Typography/Typography.tsx";
import type {AccordionProps} from "./components/Accoridon/Accordion.interface.ts";
import type {AlertProps} from "./components/Alert/Alert.interface.ts";
import type {ButtonProps} from "./components/Button/Button.interface.ts";


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
        }
    ]
] satisfies ButtonItem[][]


/* eslint-disable local/hook-order */
function App() {
    /*  DIALOG  */
    const [dialog, setDialog] = useState<'firstType' | null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const close = () => setDialog(null)

    /*  POPOVER */
    const popoverRef = useRef<HTMLDivElement>(null);


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
                <section id={'TOOLTIP'} className="section">
                    <Typography as={'h2'}>TOOLTIP</Typography>
                    <div className="block">
                        <Tooltip text="Наведение сработало, теперь убери курсор">
                            <div style={{padding: 12, borderRadius: 8, backgroundColor: 'var(--base-color-200)'}}>Наведи
                                курсор на тултип
                            </div>
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
                <section id={'FIELDSET'} className="section">
                    <Typography as={'h2'}>FIELDSET</Typography>
                    <Fieldset legend="Тариф" role="radiogroup">
                        <Radio name="plan" value="free">Бесплатный</Radio>
                        <Radio name="plan" value="pro">Профессиональный</Radio>
                    </Fieldset>
                    <Fieldset legend="Способ оплаты" orientation="inline">
                        <Checkbox name={'tip'} value="card">Картой</Checkbox>
                        <Checkbox name={'tip'} value="disc">Наличными</Checkbox>
                    </Fieldset>
                    <Fieldset legend="Способ оплаты" orientation="inline">
                        <Button>Картой</Button>
                        <Button>Наличными</Button>
                    </Fieldset>
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
