// App.tsx
import './App.css';
import {Accordion, AccordionContent, AccordionHeader} from "./components/Accoridon/Accordion.tsx";
import {Alert} from "./components/Alert/Alert.tsx";


function App() {



    return (
       <div className={'content'}>
           <div className='section'>
               <Accordion open>
                   <AccordionHeader>Заголовок открытый по умолчанию</AccordionHeader>
                   <AccordionContent>Внутренний контент</AccordionContent>
               </Accordion>
               <Accordion>
                   <AccordionHeader>Заголовок закрытый по умолчанию</AccordionHeader>
                   <AccordionContent>Все работает как базовый 'details' в html и имеет его атрибуты включая name для группировки</AccordionContent>
               </Accordion>
           </div>
           <div className='section'>
                <Alert>Base</Alert>
                <Alert variant={'WARNING'}>Warning - status</Alert>
                <Alert variant={'SUCCESS'}>Success - status</Alert>
                <Alert variant={'ERROR'}>Error - status</Alert>
           </div>
       </div>
    );
}

export default App
