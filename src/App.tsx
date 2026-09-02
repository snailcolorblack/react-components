// App.tsx
import './App.css';
import {Accordion, AccordionContent, AccordionHeader} from "./components/Accoridon/Accordion.tsx";
function App() {

    return (
        <div className='content'>
                <Accordion open>
                    <AccordionHeader>Заголовок</AccordionHeader>
                    <AccordionContent>Внутренний контент</AccordionContent>
                </Accordion>
                <Accordion>
                    <AccordionHeader>Заголовок</AccordionHeader>
                    <AccordionContent>Внутренний контент</AccordionContent>
                </Accordion>
                <Accordion>
                    <AccordionHeader>Заголовок</AccordionHeader>
                    <AccordionContent>Внутренний контент</AccordionContent>
                </Accordion>
                <Accordion>
                    <AccordionHeader>Заголовок</AccordionHeader>
                    <AccordionContent>Внутренний контент</AccordionContent>
                </Accordion>
        </div>
    );
}

export default App
