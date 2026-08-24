import { useViewInteractions } from '../hooks/use-view-interactions';
import { useAccessibility } from '../hooks/use-accessibility';

/**
 * Renders nothing. Wires the BPMN-specific viewing interactions: selection
 * semantics, embedding highlights, link snap styling and invalid-target
 * effects (the generic ones come from the built-in `<Diagram interactions>`),
 * plus the cell accessibility (tab order, labels, select on focus).
 */
export function ViewInteractions() {

    useViewInteractions();
    useAccessibility();

    return null;
}
