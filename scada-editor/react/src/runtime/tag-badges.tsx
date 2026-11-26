import { useEffect, useRef, type ReactNode } from 'react';
import { useOnGraphEvents, usePaper } from '@joint/react-plus';
import { PAPER_ID } from '../editor/paper-id';
import { hideTagBadges, showTagBadges } from './highlighters';
import { isTyping } from './keys';

// How long Alt is held before the badges show (a stray press does not flash them)
const SHOW_DELAY = 150;

/**
 * The IDs of the cells shown as badges while Alt (Option) is held, in both modes: nothing of the diagram changes,
 * the cells can be edited meanwhile (the badges of the cells added, removed, their IDs changed drawn again);
 * hidden when Alt is released or the window loses the focus (the release would not come). Alt as a modifier of
 * another key (a character on macOS, a shortcut) shows none until it is released. Mount it inside `<Diagram>`.
 */
export function TagBadges(): ReactNode {
    const { paper } = usePaper(PAPER_ID);
    const isShown = useRef(false);

    useOnGraphEvents({
        'add': () => refresh(),
        'remove': () => refresh(),
        'reset': () => refresh(),
        // An ID changed (in the data of the cell)
        'change:data': () => refresh(),
    });

    function refresh() {
        if (paper && isShown.current) {
            showTagBadges(paper);
        }
    }

    useEffect(() => {
        if (!paper) {
            return;
        }
        let timer: ReturnType<typeof setTimeout> | null = null;
        let isBlocked = false;
        const hide = () => {
            if (timer !== null) {
                clearTimeout(timer);
            }
            timer = null;
            isBlocked = false;
            isShown.current = false;
            hideTagBadges(paper);
        };
        const showSoon = () => {
            if (isShown.current || isBlocked || timer !== null) {
                return;
            }
            timer = setTimeout(() => {
                timer = null;
                isShown.current = true;
                showTagBadges(paper);
            }, SHOW_DELAY);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Alt') {
                // Alt a modifier: none until it is released (its repeated presses do not show them again)
                if (event.altKey) {
                    hide();
                    isBlocked = true;
                }
                return;
            }
            // Not the menu of the browser (Windows: Alt alone activates it) - in a field, as it types
            if (!isTyping(event)) {
                event.preventDefault();
            }
            showSoon();
        };
        const onKeyUp = (event: KeyboardEvent) => {
            if (event.key !== 'Alt') {
                return;
            }
            if (!isTyping(event)) {
                event.preventDefault();
            }
            hide();
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', hide);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', hide);
            hide();
        };
    }, [paper]);

    return null;
}
