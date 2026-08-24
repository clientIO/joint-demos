import { useEffect } from 'react';
import { usePaper, useSelectionCollection } from '@joint/react-plus';

// The cells are part of the tab order (each shape declares `tabindex`,
// `role` and `aria-label` on its root node — see the shape defaults).
// Focusing a cell with the keyboard selects it.
export function useAccessibility() {

    const { collection } = useSelectionCollection();
    const { paper } = usePaper();

    // `:focus-visible` excludes pointer focus — clicks keep their own
    // selection semantics (e.g. cherry-picking).
    useEffect(() => {
        if (!paper) return;

        const onFocusIn = (evt: FocusEvent) => {
            const target = evt.target as SVGElement;
            if (!target.matches(':focus-visible')) return;

            const view = paper.findView(target);
            if (view) collection.reset([view.model]);
        };

        paper.el.addEventListener('focusin', onFocusIn);
        return () => paper.el.removeEventListener('focusin', onFocusIn);
    }, [paper, collection]);

    // And the other way around: selecting a cell moves the focus to it, so
    // the tab order continues from the selection and assistive technologies
    // announce it.
    useEffect(() => {
        if (!paper) return;

        const onSelectionChange = () => {
            if (collection.length !== 1) return;

            const el = collection.models[0].findView(paper)?.el;
            if (el && document.activeElement !== el) {
                el.focus({ preventScroll: true });
            }
        };

        collection.on('add reset', onSelectionChange);
        return () => {
            collection.off('add reset', onSelectionChange);
        };
    }, [paper, collection]);
}
