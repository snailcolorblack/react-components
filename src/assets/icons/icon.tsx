export const plusIcon = (
    <svg
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" aria-hidden="true" focusable="false"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 19.1037V4.89258" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M4.89432 12L19.1055 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

/*
 * Шеврон вниз. Повёрнутый квадрат из бордюров рисовал ту же галочку,
 * но центрировать его приходилось коробкой с компенсирующим сдвигом:
 * у фигуры на 45° визуальный центр не совпадает с геометрическим.
 * У контура центр там, где ему положено, поэтому «открыто» — это
 * один rotate: 180deg, без второго сдвига.
 */
export const arrowIcon = (
    <svg
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" aria-hidden="true" focusable="false"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M6 9.5L12 15.5L18 9.5"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
        />
    </svg>
);

/*
 * Значки состояний для Alert. Не украшение: вариант различался только
 * цветом, а цвет один смысл нести не может (WCAG 1.4.1) — в режиме
 * высокого контраста система его подменяет, и разница пропадает совсем.
 * Поэтому у форм разные силуэты: галочка, треугольник, круг.
 */
export const successIcon = (
    <svg
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" aria-hidden="true" focusable="false"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M4 12.5L9.5 18L20 7"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
        />
    </svg>
);

export const warningIcon = (
    <svg
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" aria-hidden="true" focusable="false"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M12 3.5L21.5 20H2.5L12 3.5Z"
            stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
        />
        <path d="M12 9.5V13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 16.75V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

export const errorIcon = (
    <svg
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" aria-hidden="true" focusable="false"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        <path d="M8.5 8.5L15.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M15.5 8.5L8.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);
