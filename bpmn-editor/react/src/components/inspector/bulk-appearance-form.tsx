import { useCells, useGraph } from '@joint/react-plus';
import { setColorOnCells } from '../../actions/set-appearance-color';
import { sharedRoles, sharedValue } from '../../utils';
import { ColorSwatches } from './appearance-form';

import type { AppearanceRole, AppElement } from '../../shapes/shapes-typing';

// What each role is called in the form. The single-shape fields say "Fill",
// "Outline" and "Color", which read oddly once they stand for a task's
// background and a gateway's body at the same time.
const ROLE_LABELS: Record<AppearanceRole, string> = {
    fill: 'Fill',
    outline: 'Outline',
    text: 'Text'
};

const shapeCount = (count: number) => `${count} ${count === 1 ? 'shape' : 'shapes'}`;

/**
 * The appearance form for several shapes at once: the colours they all have,
 * each showing what they agree on and painting all of them when picked.
 */
export function BulkAppearanceForm({ elements, selected }: { elements: AppElement[], selected: number }) {

    const { graph } = useGraph();
    const roles = sharedRoles(elements);

    // Re-read what these shapes are painted with whenever it changes under the
    // form — a pick here, an undo, an edit from elsewhere. The selection
    // subscription cannot serve for this: it tracks which cells are selected,
    // and a colour change leaves that alone. This is the snapshot the
    // single-shape form takes (`useCells(cell.id)`), for a set of ids.
    useCells(elements.map((element) => element.id));

    const skipped = selected - elements.length;

    return (
        <div className="appearance-form">
            <p className="bulk-summary">
                {skipped > 0 ? `${elements.length} of ${selected} shapes` : shapeCount(elements.length)}
            </p>
            {skipped > 0 && (
                <p className="bulk-note">Links are edited on their own.</p>
            )}
            {roles.length === 0
                ? <p className="bulk-empty">These shapes have no colours in common.</p>
                : (
                    <div className="group">
                        {roles.map((role) => {
                            const value = sharedValue(elements, role);

                            return (
                                <ColorSwatches
                                    key={role}
                                    label={ROLE_LABELS[role]}
                                    value={value}
                                    hint={value === null ? 'Mixed' : undefined}
                                    onPick={(color) => setColorOnCells(graph, elements, role, color)}
                                />
                            );
                        })}
                    </div>
                )}
        </div>
    );
}
