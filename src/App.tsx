// App.tsx
import './App.css';
import {useRef, useState} from "react";
import {Accordion} from "./components/Accoridon/Accordion.tsx";
import {Alert} from "./components/Alert/Alert.tsx";
import {Button} from "./components/Button/Button.tsx";
import {Dialog} from "./components/Dialog/Dialog.tsx";


function App() {
    const [dialog, setDialog] = useState<'firstType'|'secondType'|'threeType'|null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);

    const close = () => setDialog(null)

    return (
       <div className='content'>
           <div className='section'>
               <Accordion open>
                   <Accordion.Header>Заголовок открытый по умолчанию</Accordion.Header>
                   <Accordion.Content>Внутренний контент</Accordion.Content>
               </Accordion>
               <Accordion>
                   <Accordion.Header>Заголовок закрытый по умолчанию</Accordion.Header>
                   <Accordion.Content>Все работает как базовый 'details' в html и имеет его атрибуты включая name для группировки</Accordion.Content>
               </Accordion>
           </div>
           <div className='section'>
                <Alert>Base</Alert>
                <Alert variant={'WARNING'}>Warning - status</Alert>
                <Alert variant={'SUCCESS'}>Success - status</Alert>
                <Alert variant={'ERROR'}>Error - status</Alert>
           </div>
           <div className='section'>
               <div className="block">
                   <Button variant={'DEFAULT'}>DEFAULT</Button>
                   <Button variant={'OUTLINE'}>OUTLINE</Button>
                   <Button variant={'CONTRAST'}>CONTRAST</Button>
               </div>
               <div className="block">
                   <Button variant={'DEFAULT'} loading>DEFAULT</Button>
                   <Button variant={'OUTLINE'} loading>OUTLINE</Button>
                   <Button variant={'CONTRAST'} loading>CONTRAST</Button>
               </div>
               <div className="block">
                   <Button variant={'DEFAULT'} disabled>DEFAULT</Button>
                   <Button variant={'OUTLINE'} disabled>OUTLINE</Button>
                   <Button variant={'CONTRAST'} disabled>CONTRAST</Button>
               </div>
           </div>
           <div className="section">
                <div className="block">
                    <Button size={'FULL'} onClick={() => setDialog('firstType')}>Открыть первое окно</Button>
                    <Button size={'FULL'} onClick={() => setDialog('secondType')}>Открыть второе окно</Button>
                    <Button size={'FULL'} onClick={() => setDialog('threeType')}>Открыть третье окно</Button>
                </div>

               <Dialog open={dialog === 'firstType'} onClose={close} label="Первое окно">
                   <h2>Это первое окно для модалки</h2>
                   <form method="dialog"><Button type="submit">Закрытие через форму</Button></form>
               </Dialog>
               <Dialog open={dialog === 'secondType'} onClose={close} label="Второе окно">
                   <h2>Это второе окно для модалки</h2>
                   <Button onClick={close}>Закрытие через кнопку</Button>
               </Dialog>
               <Dialog open={dialog === 'threeType'} onClose={close} label="Третье окно" ref={dialogRef}>
                   <h2>Это третье окно для модалки</h2>
                   <Button onClick={() => dialogRef.current?.close()}>Закрыть чере ref</Button>
               </Dialog>
           </div>
       </div>
    );
}

export default App
