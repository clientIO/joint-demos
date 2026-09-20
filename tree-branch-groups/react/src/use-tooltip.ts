import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** The id of the one tooltip of the app (see `app.tsx`). */
export const TOOLTIP_ID = 'tip';

/**
 * Names an element for the tooltip. The attributes are set after the
 * element is mounted, as an attribute change: that is the path react-tooltip
 * watches for new anchors - the buttons of the cells come and go with the
 * cells, well after the tooltip is mounted, and nodes added with the
 * attributes in place were not found.
 */
export function useTooltip<T extends Element>(content: string): RefObject<T | null> {
    const ref = useRef<T>(null);
    useEffect(() => {
        const el = ref.current;
        // No content, no tooltip.
        if (!el || !content) return;
        el.setAttribute('data-tooltip-content', content);
        el.setAttribute('data-tooltip-id', TOOLTIP_ID);
        return () => {
            el.removeAttribute('data-tooltip-id');
            el.removeAttribute('data-tooltip-content');
        };
    }, [content]);
    return ref;
}

