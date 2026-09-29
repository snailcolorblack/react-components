import {useRef, useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '../Button/Button';
import {Typography} from '../Typography/Typography';
import {Dialog} from './Dialog';

const meta = {
    title: 'Слои/Dialog',
    component: Dialog,
    args: {label: 'Окно'},
    parameters: {
        docs: {description: {component: `Нативный \`<dialog>\`: верхний слой, затемнение через \`::backdrop\`, ловушка фокуса,
Esc и возврат фокуса на открывшую кнопку — всё делает браузер.

Три способа открыть: проп \`open\`, \`ref.current.showModal()\` и кнопка-инвокер
\`command="show-modal"\`. Закрытие тоже нативное, включая \`<form method="dialog">\`,
которое кладёт значение в \`dialog.returnValue\`.

\`closedBy\` целиком опирается на атрибут \`closedby\`; там, где движок его не знает,
компонент подменяет только клик мимо при \`any\`.`}},
    },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Через состояние: `open` открывает, `onClose` закрывает. */
export const ЧерезState: Story = {
    render: function State(args) {
        const [open, setOpen] = useState(false);

        return <>
            <Button onClick={() => setOpen(true)}>Открыть</Button>
            <Dialog {...args} open={open} onClose={() => setOpen(false)}>
                <Typography as="h2">Окно открыто через state</Typography>
                <form method="dialog"><Button type="submit">Закрыть формой</Button></form>
            </Dialog>
        </>;
    },
};

/** Через ref: родные `showModal()` и `close()` у `<dialog>`. */
export const ЧерезRef: Story = {
    render: function Ref(args) {
        const dialog = useRef<HTMLDialogElement>(null);

        return <>
            <Button onClick={() => dialog.current?.showModal()}>Открыть</Button>
            <Dialog {...args} ref={dialog}>
                <Typography as="h2">Окно открыто через ref</Typography>
                <Button onClick={() => dialog.current?.close()}>Закрыть через ref</Button>
            </Dialog>
        </>;
    },
};

/** Нативно: кнопка-инвокер, JS не написано ни строчки. */
export const ЧерезКоманду: Story = {
    render: args => <>
        <Button commandfor="story-dialog" command="show-modal">Открыть</Button>
        <Dialog {...args} id="story-dialog">
            <Typography as="h2">Окно открыто командой</Typography>
            <Button commandfor="story-dialog" command="close">Закрыть командой</Button>
        </Dialog>
    </>,
};

/**
 * `closedBy="none"` держит окно открытым: ни Esc, ни клик мимо его не закроют,
 * остаётся только своя кнопка. Для шагов, которые нельзя бросить на середине.
 */
export const НеЗакрыватьСлучайно: Story = {
    args: {closedBy: 'none'},
    render: function Sticky(args) {
        const dialog = useRef<HTMLDialogElement>(null);

        return <>
            <Button onClick={() => dialog.current?.showModal()}>Открыть</Button>
            <Dialog {...args} ref={dialog}>
                <Typography as="h2">Esc и клик мимо не закрывают</Typography>
                <Button onClick={() => dialog.current?.close()}>Закрыть кнопкой</Button>
            </Dialog>
        </>;
    },
};
