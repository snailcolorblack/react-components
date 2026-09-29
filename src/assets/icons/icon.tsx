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
