import type {Meta, StoryObj} from '@storybook/react-vite';
import {Typography} from './Typography';

const meta = {
    title: 'Текст/Typography',
    component: Typography,
    args: {children: 'Съешь ещё этих мягких французских булок'},
    parameters: {
        docs: {description: {component: `\`as\` отвечает за смысл, \`variant\` — только за размер. Разведены потому, что в вёрстке
эти вещи расходятся: первый заголовок страницы бывает визуально мелким, а крупная
цифра в карточке заголовком не является.

Насыщенность и начертание остаются за тегом: \`variant="h1"\` на \`<div>\` даст 40px
обычным начертанием, а не «похоже на заголовок».

Шкала объявлена переменными на самом компоненте, поэтому размер точки шкалы меняется
одной строкой: \`style={{'--font-size-40': '3rem'}}\`.`}},layout: 'padded'},
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

const SCALE = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'lead', 'subtitle', 'note', 'caption'] as const;

export const Шкала: Story = {
    render: args => (
        <div style={{display: 'grid', gap: '0.75rem'}}>
            {SCALE.map(variant => (
                <Typography key={variant} {...args} variant={variant}>
                    {variant} — {args.children}
                </Typography>
            ))}
        </div>
    ),
};

/**
 * `as` отвечает за смысл, `variant` — только за размер. Первый заголовок
 * страницы бывает визуально мелким, и наоборот: крупная цифра в карточке
 * заголовком не является.
 */
export const СмыслИРазмерРазведены: Story = {
    render: () => (
        <div style={{display: 'grid', gap: '0.75rem'}}>
            <Typography as="h1" variant="h3">h1 с размером h3</Typography>
            <Typography as="div" variant="h1">div с размером h1 — обычное начертание</Typography>
            <Typography as="strong" variant="p">strong остаётся жирным</Typography>
        </div>
    ),
};

/**
 * `inheritable` не задаёт размер вовсе — берёт родительский. Тег по умолчанию
 * `span`: такой кусок обычно стоит внутри строки.
 */
export const Наследуемый: Story = {
    render: () => (
        <div style={{fontSize: '28px'}}>
            Родитель 28px, а внутри{' '}
            <Typography variant="inheritable">наследуемый кусок того же размера</Typography>
        </div>
    ),
};

/** Точка шкалы меняется переменной на самом элементе, без правки стилей. */
export const СвойРазмерШкалы: Story = {
    render: () => (
        <Typography as="h1" style={{'--font-size-40': '3rem'} as React.CSSProperties}>
            Заголовок 48px вместо 40px
        </Typography>
    ),
};
