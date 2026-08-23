import { useViewInteractions } from '../hooks/use-view-interactions';

// Renders nothing. Wires the BPMN-specific viewing interactions: selection
// semantics, embedding highlights, link snap styling and invalid-target
// effects (the generic ones come from the built-in `<Diagram interactions>`).
export function ViewInteractions() {

    useViewInteractions();

    return null;
}
