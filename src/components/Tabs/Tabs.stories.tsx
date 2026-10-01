import {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {Tabs} from './Tabs';

const meta = {
    title: 'Навигация/Tabs',
    component: Tabs,
    parameters: {
        docs: {
            description: {
                component: `Нативного элемента вкладок в HTML нет, поэтому роли расставлены руками
по паттерну tabs из APG: \`tablist\`, \`tab\`, \`tabpanel\`, связи \`aria-controls\`
и \`aria-labelledby\`. Замерено в Chromium 141: в дереве доступности это
\`tablist\` и \`tabpanel\`, то есть скринридер говорит «вкладка, 1 из 3».

Клавиатура: в список ведёт один Tab — в табуляции всегда только открытая
кнопка. Внутри ходят стрелки (по кругу), Home и End ведут к краям,
выключенные вкладки перескакиваются. Активация автоматическая: стрелка
сразу показывает панель.

Закрытые панели остаются в разметке под \`hidden="until-found"\`. У них
сохраняется прокрутка, введённый текст и загруженные данные, а Ctrl+F
находит текст внутри закрытой вкладки и открывает её — событие
\`beforematch\` компонент подхватывает и переключает состояние, иначе
браузер показал бы панель, а \`aria-selected\` осталось бы на другой кнопке.`,
            },
        },
    },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Обычный набор: полоса кнопок и панели под ней. */
export const Базовые: Story = {
    render: () => (
        <Tabs defaultValue="about">
            <Tabs.Buttons label="Раздел">
                <Tabs.Button value="about">Описание</Tabs.Button>
                <Tabs.Button value="reviews">Отзывы</Tabs.Button>
                <Tabs.Button value="delivery">Доставка</Tabs.Button>
            </Tabs.Buttons>

            <Tabs.Content value="about">Состав, размеры и всё, что стоит знать до покупки.</Tabs.Content>
            <Tabs.Content value="reviews">Двести сорок отзывов, средняя оценка 4,6.</Tabs.Content>
            <Tabs.Content value="delivery">По городу за день, по стране за три.</Tabs.Content>
        </Tabs>
    ),
};

/** Кнопки слева: стрелки начинают ходить вверх и вниз, а не вбок. */
export const Вертикальные: Story = {
    render: () => (
        <Tabs defaultValue="profile" orientation="vertical">
            <Tabs.Buttons label="Настройки">
                <Tabs.Button value="profile">Профиль</Tabs.Button>
                <Tabs.Button value="security">Безопасность</Tabs.Button>
                <Tabs.Button value="notices">Уведомления</Tabs.Button>
            </Tabs.Buttons>

            <Tabs.Content value="profile">Имя, аватар, часовой пояс.</Tabs.Content>
            <Tabs.Content value="security">Пароль, вход по коду, активные сессии.</Tabs.Content>
            <Tabs.Content value="notices">Почта, пуши, дайджест раз в неделю.</Tabs.Content>
        </Tabs>
    ),
};

/**
 * Выключенная вкладка остаётся в списке и объявляется скринридером —
 * это `aria-disabled`, а не `disabled`. Стрелки её перескакивают.
 */
export const ВыключеннаяВкладка: Story = {
    render: () => (
        <Tabs defaultValue="about">
            <Tabs.Buttons label="Раздел">
                <Tabs.Button value="about">Описание</Tabs.Button>
                <Tabs.Button value="stock" disabled>Наличие</Tabs.Button>
                <Tabs.Button value="reviews">Отзывы</Tabs.Button>
            </Tabs.Buttons>

            <Tabs.Content value="about">Состав, размеры и всё, что стоит знать до покупки.</Tabs.Content>
            <Tabs.Content value="stock">Раздел появится, когда товар вернётся на склад.</Tabs.Content>
            <Tabs.Content value="reviews">Двести сорок отзывов, средняя оценка 4,6.</Tabs.Content>
        </Tabs>
    ),
};

/**
 * Состояние снаружи: значение приходит пропом и меняется в `onChange`.
 * Так вкладку можно открыть кнопкой со стороны.
 */
export const Управляемые: Story = {
    render: function Controlled() {
        const [value, setValue] = useState('about');

        return (
            <div style={{display: 'grid', gap: '1rem', justifyItems: 'start'}}>
                <button type="button" onClick={() => setValue('reviews')}>Открыть отзывы снаружи</button>

                <Tabs value={value} onChange={setValue}>
                    <Tabs.Buttons label="Раздел">
                        <Tabs.Button value="about">Описание</Tabs.Button>
                        <Tabs.Button value="reviews">Отзывы</Tabs.Button>
                    </Tabs.Buttons>

                    <Tabs.Content value="about">Состав, размеры и всё остальное.</Tabs.Content>
                    <Tabs.Content value="reviews">Двести сорок отзывов.</Tabs.Content>
                </Tabs>

                <p>Открыто: {value}</p>
            </div>
        );
    },
};

/**
 * Состояние закрытой панели не теряется: наберите текст, переключитесь
 * и вернитесь. И попробуйте найти на странице «спрятанное слово» —
 * Ctrl+F найдёт его в закрытой вкладке и откроет её.
 */
export const СостояниеСохраняется: Story = {
    render: () => (
        <Tabs defaultValue="form">
            <Tabs.Buttons label="Раздел">
                <Tabs.Button value="form">Форма</Tabs.Button>
                <Tabs.Button value="text">Текст</Tabs.Button>
            </Tabs.Buttons>

            <Tabs.Content value="form">
                <label>Наберите что-нибудь: <input type="text"/></label>
            </Tabs.Content>
            <Tabs.Content value="text">
                Здесь лежит спрятанное слово, которое находится поиском по странице.
            </Tabs.Content>
        </Tabs>
    ),
};

/**
 * Вид PILL: кнопки встык в коробке, под активной ездит таблетка.
 * Разметка та же — `tablist` с кнопками `tab`, — меняется только оформление,
 * и рисует его та же оболочка, что у ButtonGroup.
 */
export const Таблетка: Story = {
    render: () => (
        <Tabs defaultValue="nbt" variant="PILL">
            <Tabs.Buttons label="Курс">
                <Tabs.Button value="nbt">НБТ</Tabs.Button>
                <Tabs.Button value="cash">В кассе</Tabs.Button>
                <Tabs.Button value="card">Картой</Tabs.Button>
                <Tabs.Button value="wire">Безналичные</Tabs.Button>
            </Tabs.Buttons>

            <Tabs.Content value="nbt">Официальный курс Национального банка.</Tabs.Content>
            <Tabs.Content value="cash">Курс в кассах отделений.</Tabs.Content>
            <Tabs.Content value="card">Курс по операциям картой.</Tabs.Content>
            <Tabs.Content value="wire">Курс по безналичным переводам.</Tabs.Content>
        </Tabs>
    ),
};

/** Таблетка, поставленная вертикально. */
export const ТаблеткаВертикально: Story = {
    render: () => (
        <Tabs defaultValue="profile" variant="PILL" orientation="vertical">
            <Tabs.Buttons label="Настройки">
                <Tabs.Button value="profile">Профиль</Tabs.Button>
                <Tabs.Button value="security">Безопасность</Tabs.Button>
                <Tabs.Button value="notices">Уведомления</Tabs.Button>
            </Tabs.Buttons>

            <Tabs.Content value="profile">Имя, аватар, часовой пояс.</Tabs.Content>
            <Tabs.Content value="security">Пароль, вход по коду, сессии.</Tabs.Content>
            <Tabs.Content value="notices">Почта, пуши, дайджест.</Tabs.Content>
        </Tabs>
    ),
};
