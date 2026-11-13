import {useState} from 'react';
import {Button} from '../Button/Button';
import {Input} from '../Input/Input';
import {Typography} from '../Typography/Typography';
import {Drawer} from './Drawer';
import type {Meta, StoryObj} from '@storybook/react-vite';
import type {DrawerProps} from './Drawer.interface.ts';

const meta = {
    title: 'Слои/Drawer',
    component: Drawer,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `Выезжающая панель: модальное окно, прижатое к краю экрана.

Под ней \`<dialog>\` с \`showModal()\`, поэтому слой поверх всего, затемнение \`::backdrop\`,
ловушка фокуса, Esc и возврат фокуса на триггер приходят от браузера. Замерено
в Chromium 141: у открытой панели \`:modal\`, ссылка на странице под ней фокус не получает,
Esc и щелчок в затемнение закрывают.

Выезд целиком на CSS: \`@starting-style\` даёт кадр до показа, а \`transition-behavior:
allow-discrete\` у \`display\` и \`overlay\` держит окно в слое, пока оно уезжает. Ни таймеров,
ни состояния «закрывается».

**Ступени.** \`snap={['40vh', 'full']}\` — потянули вверх, панель встала на следующую;
потянули вниз с нижней — закрылась. Замерено: панель идёт за пальцем (440 → 390 → 340 → 280)
и после отпускания встаёт на 720px при окне 800.

**Перетаскивание.** По умолчанию только пальцем (\`drag="touch"\`): мышью панели таскать
никто не привык. \`drag\` включает его всем, \`false\` — отключает вовсе. Жест с содержимого
начинается только тогда, когда список прокручен к краю, куда панель уезжает, — иначе он
спорил бы с прокруткой (замерено: жест по прокрученному списку панель не трогает).

**Ручка — кнопка, а не полоска.** Её видно табуляции, нажатие переводит на следующую
ступень, стрелки двигают по ступеням, а с нижней стрелка вниз закрывает. Жест —
добавка, а не единственный способ.`,
            },
        },
    },
} satisfies Meta<typeof Drawer>;

export default meta;

type Story = StoryObj<typeof meta>;

function Demo({children, ...args}: Partial<DrawerProps>) {
    const [open, setOpen] = useState(false);
    const [snap, setSnap] = useState<number | null>(null);

    return (
        <div style={{display: 'grid', gap: '1rem', justifyItems: 'start'}}>
            <Button onClick={() => setOpen(true)}>Открыть панель</Button>
            {snap !== null && <Typography>Ступень: {snap}</Typography>}

            <Drawer
                {...args}
                open={open}
                onClose={() => setOpen(false)}
                onSnapChange={index => setSnap(index)}
                label={args.label ?? 'Панель'}
            >
                {children}
            </Drawer>
        </div>
    );
}

const LIST = Array.from({length: 30}, (_, i) => <Typography key={i}>Строка списка №{i + 1}</Typography>);

/** Снизу, по содержимому: два поля и кнопка. */
const STUB = {open: false, onClose: () => undefined};

export const Снизу: Story = {
    args: {...STUB, label: 'Фильтры'},
    render: args => (
        <Demo {...args}>
            <div style={{display: 'grid', gap: '1rem'}}>
                <Typography as="h3">Фильтры</Typography>
                <Input label="От" name="от"/>
                <Input label="До" name="до"/>
            </div>
        </Demo>
    ),
};

/** Две ступени и длинный список: тянется и прокручивается. */
export const СоСтупенями: Story = {
    args: {...STUB, label: 'Счета', snap: ['40vh', 'full'], drag: true},
    render: args => <Demo {...args}><div style={{display: 'grid', gap: '0.5rem'}}>{LIST}</div></Demo>,
};

/** Сбоку: то же самое, только едет по горизонтали. */
export const Сбоку: Story = {
    args: {...STUB, label: 'Меню', side: 'end', snap: ['18rem'], drag: true},
    render: args => <Demo {...args}><div style={{display: 'grid', gap: '0.5rem'}}>{LIST.slice(0, 8)}</div></Demo>,
};

/** Сверху — например, для уведомлений или поиска. */
export const Сверху: Story = {
    args: {...STUB, label: 'Поиск', side: 'top', drag: true},
    render: args => (
        <Demo {...args}>
            <Input label="Что ищем" name="запрос"/>
        </Demo>
    ),
};

/** Без ручки: панель закрывают своей кнопкой, Esc или щелчком мимо. */
export const БезРучки: Story = {
    args: {...STUB, label: 'Подтверждение', variant: 'PLAIN'},
    render: args => (
        <Demo {...args}>
            <div style={{display: 'grid', gap: '1rem'}}>
                <Typography>Удалить черновик заявки?</Typography>
            </div>
        </Demo>
    ),
};
