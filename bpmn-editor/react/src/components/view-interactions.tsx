import { useViewInteractions } from '../hooks/use-view-interactions';
import { useAccessibility } from '../hooks/use-accessibility';
import { useShapeIconContrast } from '../hooks/use-shape-icon-contrast';

/**
 * Renders nothing. Wires the BPMN-specific viewing interactions: selection
 * semantics, embedding highlights, link snap styling and invalid-target
 * effects (the generic ones come from the built-in `<Diagram interactions>`),
 * plus the cell accessibility (tab order, labels, select on focus) and the
 * shape icon contrast.
 */
export function ViewInteractions() {

    useViewInteractions();
    useAccessibility();
    useShapeIconContrast();

    return null;
}
