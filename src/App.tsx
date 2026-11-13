// App.tsx
import Content from "layout/main/_content/content.tsx";
import Menu from "layout/main/_menu/menu.tsx";
import {Container} from 'component/Container/Container.tsx';
import {Tabs} from 'component/Tabs/Tabs.tsx';
import type {Pages} from 'layout/main/main.interface.ts';
import {useMedia} from '@/hooks/useMedia.ts';
import './App.css';

const _children: Pages = {
    // typography: lazy(() => import('layout/main/content/Typography/Typography.component.tsx')),
    // wrapper: lazy(() => import('layout/main/content/Wrapper/Wrapper.component.tsx')),
};


const DESKTOP = '(width > 540px)';
const FIRST = Object.keys(_children)[0];

export default function App() {
    const desktop = useMedia(DESKTOP);

    return (
        <Container as={'main'} className={'content'} size={'WIDE'}>
            <Tabs variant={'PILL'}
                  orientation={desktop ? 'vertical' : 'horizontal'}
                  defaultValue={FIRST}
                  className={'book'}
            >
                <Menu pages={_children}/>
                <Content pages={_children}/>
            </Tabs>
        </Container>
    );
}
