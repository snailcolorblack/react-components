import type {Meta, StoryObj} from '@storybook/react-vite';
import {Accordion} from './Accordion';

const meta = {
    title: 'Раскрытие/Accordion',
    component: Accordion,
    parameters: {
        docs: {description: {component: `Под компонентом нативные \`<details>\` и \`<summary>\`: раскрытие, Enter и Space, роль
с состоянием «развёрнут» и поиск по странице внутри свёрнутого блока — всё браузерное,
состояния в React нет.

Общий \`name\` превращает набор блоков в гармошку, где открыт только один раздел.
Анатомия: \`Accordion > Accordion.Header + Accordion.Content\`, только точечная запись.`}},layout: 'padded'},
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Закрытый: Story = {
    render: args => (
        <Accordion {...args}>
            <Accordion.Header>Заголовок</Accordion.Header>
            <Accordion.Content>Содержимое может быть любым: текст, поля, картинки.</Accordion.Content>
        </Accordion>
    ),
};

export const Открытый: Story = {
    args: {open: true},
    render: Закрытый.render,
};

/**
 * Общий `name` делает из нескольких `details` гармошку, в которой открыт
 * только один раздел. Это платформа: ни строчки JS.
 */
export const ТолькоОдинОткрыт: Story = {
    render: () => (
        <div style={{display: 'grid', gap: '0.5rem', minInlineSize: '28rem'}}>
            {['Первый', 'Второй', 'Третий'].map(title => (
                <Accordion key={title} name="faq">
                    <Accordion.Header>{title} раздел</Accordion.Header>
                    <Accordion.Content>Содержимое раздела «{title}».</Accordion.Content>
                </Accordion>
            ))}
        </div>
    ),
};

/** Своя иконка вместо плюса. Она помечена aria-hidden и поворачивается при раскрытии. */
export const СвояИконка: Story = {
    render: () => (
        <Accordion>
            <Accordion.Header icon={<span aria-hidden="true">＋</span>}>Заголовок со своей иконкой</Accordion.Header>
            <Accordion.Content>Поворот считается от исходного положения.</Accordion.Content>
        </Accordion>
    ),
};
