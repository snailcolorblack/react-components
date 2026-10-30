import type {Meta, StoryObj} from '@storybook/react-vite';
import {Typography} from '../Typography/Typography';
import {Wrapper} from '../Wrapper/Wrapper';
import {Container} from './Container';

const meta = {
    title: 'Раскладка/Container',
    component: Container,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `Ограничитель ширины: держит содержимое по середине страницы и не даёт строке
растянуться на весь экран. Своего вида у него нет — это раскладка, сделанная поверх
\`Wrapper\` в варианте \`PLAIN\`, поэтому он так же полиморфен: \`as="main"\`, \`as="section"\`.

Три размера. Замерено при окне 1900px: \`WIDE\` — 1440px, \`NORMAL\` — 1064px, \`PHONE\` — 480px,
все три по середине родителя.

Отступ от краёв экрана — \`clamp(1rem, 4vw, 2rem)\`. Замерено: 16px держится до окна в 400px,
дальше растёт и упирается в 32px на 800px. Единица \`vw\`, а не \`cqi\`: это поле до края
экрана, и оно обязано быть одинаковым у всех страниц.

Отступ есть только у верхнего контейнера — у вложенного он нулевой (замерено). Иначе
колонка внутри страницы отодвигалась бы от краёв дважды, а на трёх уровнях это 96px
с каждой стороны.`,
            },
        },
    },
} satisfies Meta<typeof Container>;

export default meta;

type Story = StoryObj<typeof meta>;

const Полоса = ({children}: {children: string}) => (
    <Wrapper><Typography>{children}</Typography></Wrapper>
);

/** Во всю страницу: 1440px. */
export const Широкий: Story = {
    args: {size: 'WIDE', children: <Полоса>WIDE — 1440px</Полоса>},
};

/** Обычный разворот: им набирается почти всё. */
export const Обычный: Story = {
    args: {size: 'NORMAL', children: <Полоса>NORMAL — 1064px</Полоса>},
};

/** Смартфонный вид: колонка остаётся узкой и на большом экране. */
export const Смартфонный: Story = {
    args: {size: 'PHONE', children: <Полоса>PHONE — 480px</Полоса>},
};

/** Все три рядом — видно, как они вложены друг в друга по ширине. */
export const Втроём: Story = {
    render: () => (
        <div style={{display: 'grid', gap: '1rem', paddingBlock: '1rem'}}>
            <Container size="WIDE"><Полоса>WIDE — 1440px</Полоса></Container>
            <Container size="NORMAL"><Полоса>NORMAL — 1064px</Полоса></Container>
            <Container size="PHONE"><Полоса>PHONE — 480px</Полоса></Container>
        </div>
    ),
};

/**
 * Вложенность: отступ от краёв экрана есть только у верхнего.
 * Внутренние контейнеры только сужают колонку.
 */
export const Вложенность: Story = {
    render: () => (
        <Container size="WIDE" style={{paddingBlock: '1rem'}}>
            <Wrapper style={{display: 'grid', gap: '1rem'}}>
                <Typography>Верхний контейнер: отступ от краёв экрана его</Typography>
                <Container>
                    <Wrapper style={{display: 'grid', gap: '1rem'}}>
                        <Typography>Вложенный: своего отступа нет</Typography>
                        <Container size="PHONE">
                            <Wrapper><Typography>И у этого тоже нет</Typography></Wrapper>
                        </Container>
                    </Wrapper>
                </Container>
            </Wrapper>
        </Container>
    ),
};

/** Свой предел — переменной, без нового значения в списке размеров. */
export const СвоимПределом: Story = {
    args: {
        children: <Полоса>Предел задан переменной: 800px</Полоса>,
        style: {'--container-max': '800px'} as React.CSSProperties,
    },
};
