import { useEffect } from 'react';
import { usePaperScroller } from '@joint/react-plus';
import { PAPER_ID } from '../editor/paper-id';

// How long the pointer rests before the cursor is hidden (ms)
const HIDE_DELAY = 3000;
// The class of the paper scroller while the cursor is hidden (see `runtime.css`)
const HIDDEN_CLASS = 'scada-cursor-hidden';

/**
 * Run mode: the mouse cursor hidden while the pointer rests on the canvas (a display watched, not operated),
 * shown again when it moves. Not while a button is pressed (a slider dragged); a touch or a pen has no cursor.
 */
export function useHiddenCursor(): void {
    const { paperScroller } = usePaperScroller(PAPER_ID);
    useEffect(() => {
        const element = paperScroller?.el;
        if (!element) {
            return;
        }
        let timer: ReturnType<typeof setTimeout> | undefined;
        const show = () => {
            clearTimeout(timer);
            element.classList.remove(HIDDEN_CLASS);
        };
        const restart = (event: PointerEvent) => {
            show();
            if (event.pointerType === 'mouse' && event.buttons === 0) {
                timer = setTimeout(() => element.classList.add(HIDDEN_CLASS), HIDE_DELAY);
            }
        };
        element.addEventListener('pointermove', restart);
        element.addEventListener('pointerdown', restart);
        element.addEventListener('pointerleave', show);
        return () => {
            element.removeEventListener('pointermove', restart);
            element.removeEventListener('pointerdown', restart);
            element.removeEventListener('pointerleave', show);
            show();
        };
    }, [paperScroller]);
}
