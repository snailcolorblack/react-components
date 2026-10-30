import type {Meta, StoryObj} from '@storybook/react-vite';
import {Typography} from '../Typography/Typography';
import {Wrapper} from './Wrapper';

const meta = {
    title: 'Раскладка/Wrapper',
    component: Wrapper,
    decorators: [
        Story => (
            <div style={{inlineSize: 'min(48rem, calc(100vw - 4rem))'}}>
                <Story/>
            </div>
        ),
    ],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `Основной блок содержимого вместо голого \`<div>\`: отступы, скругление и фон
приходят из общих переменных, поэтому блоки по всему приложению одинаковы, а не «почти
одинаковы».

Полиморфная: один и тот же блок бывает разделом, статьёй, формой и нажимаемой карточкой.
Пропсы наследуются от выбранного тега — \`action\` появляется только у формы, \`href\` только
у ссылки.

Вместе с тегом приходят и собственные стили браузера, и обёртка снимает их сама. Замерено
в Chromium 141: \`<button>\` приходит со шрифтом 13.333px Arial, выравниванием по центру
и рамкой 2px outset, \`<fieldset>\` — с рамкой 2px groove и \`min-inline-size: min-content\`,
из-за которого он не сжимается в гибкой раскладке. После обёртки все семь тегов дают
одинаковые вычисленные стили: шрифт 16px, рамки нет, выравнивание по началу строки,
отступ 32px, скругление 24px.

Коробка объявлена размерным контейнером, и отступ задан в \`cqi\` — долях ширины
контейнера-предка, а не окна. Замерено: блок внутри обёртки шириной 720px получает
отступ 21.6px, тогда как \`3vw\` при окне в 1900px дал бы 57px.`,
            },
        },
    },
} satisfies Meta<typeof Wrapper>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Обычный блок. */
export const Блок: Story = {
    args: {children: 'Содержимое блока'},
};

/** Семантика — пропом, вид не меняется. */
export const Статья: Story = {
    args: {
        as: 'article',
        children: (
            <>
                <Typography as="h3">Заголовок статьи</Typography>
                <Typography>Текст статьи. Тег здесь article, а выглядит он так же, как div.</Typography>
            </>
        ),
    },
};

/** Нажимаемая карточка: тег кнопки, вид блока, type="button" по умолчанию. */
export const Карточка: Story = {
    args: {
        as: 'button',
        children: 'Нажмите на этот блок',
        onClick: () => undefined,
    },
};

/** Форма — тот же блок. Поля внутри, отправка своя. */
export const Форма: Story = {
    args: {
        as: 'form',
        children: (
            <>
                <Typography as="h3">Форма</Typography>
                <Typography>Блок с тегом form: пропсы формы доступны, вид общий.</Typography>
            </>
        ),
    },
};

/**
 * `PLAIN` — только раскладка: ни фона, ни отступов, ни скругления.
 * Внешний блок группирует внутренние, а своего вида у него нет —
 * карточка в карточке читается как нагромождение слоёв.
 */
export const Вложенность: Story = {
    args: {
        variant: 'PLAIN',
        style: {display: 'grid', gap: '1rem'},
        children: (
            <>
                <Wrapper>Первая карточка</Wrapper>
                <Wrapper>Вторая карточка</Wrapper>
            </>
        ),
    },
};

/** Переменные меняют вид, не трогая раскладку. */
export const СвоиПеременные: Story = {
    args: {
        children: 'Блок со своим фоном и скруглением',
        style: {
            '--wrapper-bg': 'var(--base-color-500)',
            '--wrapper-radius': '0.5rem',
            '--wrapper-padding': '2.5rem',
        } as React.CSSProperties,
    },
};
