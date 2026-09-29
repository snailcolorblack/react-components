import {useRef} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '../Button/Button';
import {Toast} from './Toast';
import type {ToastHandle} from './Toast.interface';

const meta = {
    title: 'Сообщения/Toast',
    component: Toast,
    argTypes: {
        position: {
            control: 'inline-radio',
            options: ['TOP_START', 'TOP_CENTER', 'TOP_END', 'BOTTOM_START', 'BOTTOM_CENTER', 'BOTTOM_END'],
        },
    },
    args: {position: 'BOTTOM_END', duration: 5000},
    parameters: {
        docs: {description: {component: `\`Toast\` — это ОБЛАСТЬ, а не одна плашка: монтируется один раз, ничего не рисует
на месте и держит очередь сам. Сколько раз позвали \`show\`, столько и сообщений.

Движение одностороннее: снаружи сообщение только показывают, закрывает его сама
плашка — крестиком или таймером. Отсчёт замирает под курсором и при фокусе внутри
(WCAG 2.2.1), поэтому у ручки нет ни \`hide\`, ни \`clear\`.

Область лежит в верхнем слое (\`popover="manual"\`) и объявлена вежливым живым
регионом: объявляет сообщения именно она, а не плашка, — живой регион должен быть
в DOM до появления текста.`}},
    },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Toast — это ОБЛАСТЬ, а не одна плашка: монтируется один раз, ничего
 * не рисует на месте и держит очередь сам. Снаружи сообщение только
 * показывают, закрывает его сама плашка — крестиком или таймером.
 */
export const ОдноСообщение: Story = {
    render: function One(args) {
        const toast = useRef<ToastHandle>(null);

        return <>
            <Button onClick={() => toast.current?.show('Сохранено', {variant: 'SUCCESS'})}>
                Показать
            </Button>
            <Toast {...args} ref={toast}/>
        </>;
    },
};

/** Сколько раз позвали `show`, столько и плашек: четыре отказа — четыре сообщения. */
export const НесколькоСразу: Story = {
    render: function Many(args) {
        const toast = useRef<ToastHandle>(null);
        const errors = [
            'Не удалось синхронизировать черновик',
            'Файл «договор.pdf» не загрузился',
            'Курс валют устарел: показываем вчерашний',
            'Сессия истекает через минуту',
        ];

        return <>
            <Button onClick={() => errors.forEach(text => toast.current?.show(text, {variant: 'ERROR'}))}>
                Четыре сообщения
            </Button>
            <Toast {...args} ref={toast}/>
        </>;
    },
};

/** У каждого сообщения может быть свой срок жизни; `0` — не закрывать. */
export const СвойТаймер: Story = {
    render: function Timers(args) {
        const toast = useRef<ToastHandle>(null);

        return <>
            <div style={{display: 'flex', gap: '1rem'}}>
                <Button onClick={() => toast.current?.show('Исчезну через секунду', {duration: 1000})}>
                    1 секунда
                </Button>
                <Button variant="OUTLINE" onClick={() => toast.current?.show('Останусь до крестика', {duration: 0})}>
                    Без таймера
                </Button>
            </div>
            <Toast {...args} ref={toast}/>
        </>;
    },
};

/** Своя область на каждый угол: сообщения складываются столбиком в своей. */
export const ДваУгла: Story = {
    render: function Corners(args) {
        const bottom = useRef<ToastHandle>(null);
        const top = useRef<ToastHandle>(null);

        return <>
            <div style={{display: 'flex', gap: '1rem'}}>
                <Button onClick={() => bottom.current?.show('Снизу справа')}>Снизу</Button>
                <Button variant="OUTLINE" onClick={() => top.current?.show('Сверху слева')}>Сверху</Button>
            </div>
            <Toast {...args} ref={bottom} position="BOTTOM_END"/>
            <Toast {...args} ref={top} position="TOP_START"/>
        </>;
    },
};

/** Иконка и вариант задаются на каждое сообщение отдельно. */
export const СИконкой: Story = {
    render: function WithIcon(args) {
        const toast = useRef<ToastHandle>(null);
        const check = (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
        );

        return <>
            <Button onClick={() => toast.current?.show('Сохранено', {variant: 'SUCCESS', icon: check})}>
                С иконкой
            </Button>
            <Toast {...args} ref={toast}/>
        </>;
    },
};
