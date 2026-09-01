import { useCells, useGraph } from '@joint/react-plus';
import { setAppearanceOnCells } from '../../actions/set-appearance';
import { fieldFor, sharedRoles, sharedValue } from '../../utils';
import { AppearanceSelect, ColorSwatches } from './appearance-form';

import type { AppearanceRole, BpmnElement, BpmnLink } from '../../shapes/shapes-typing';

// What each role is called, per kind. The single-cell fields say "Fill",
// "Outline" and "Color", which read oddly once they stand for a task's
// background and a gateway's body at once — and a connector has a line where a
// shape has a border.
const SHAPE_LABELS: Partial<Record<AppearanceRole, string>> = {
    fill: 'Fill',
    outline: 'Outline',
    text: 'Text',
    'font-family': 'Font style',
    'font-size': 'Size',
    'font-weight': 'Font thickness'
};

const CONNECTOR_LABELS: Partial<Record<AppearanceRole, string>> = {
    outline: 'Line',
    text: 'Text',
    'font-family': 'Font style',
    'font-size': 'Size',
    'font-weight': 'Font thickness'
};

const countOf = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * The appearance form for several cells at once: a section per kind, each
 * offering the colours everything in it has, and painting all of them when one
 * is picked.
 */
export function BulkAppearanceForm({ elements, links }: { elements: BpmnElement[], links: BpmnLink[] }) {

    const { graph } = useGraph();

    // Re-read what the cells are painted with whenever it changes under the
    // form — a pick here, an undo, an edit from elsewhere. The selection
    // subscription cannot serve for this: it tracks which cells are selected,
    // and a colour change leaves that alone. This is the snapshot the
    // single-cell form takes (`useCells(cell.id)`), for a set of ids.
    useCells([...elements, ...links].map((cell) => cell.id));

    return (
        <div className="appearance-form">
            <BulkSection
                cells={elements}
                labels={SHAPE_LABELS}
                summary={countOf(elements.length, 'shape', 'shapes')}
                onPick={(role, value) => setAppearanceOnCells(graph, elements, role, value)}
            />
            <BulkSection
                cells={links}
                labels={CONNECTOR_LABELS}
                summary={countOf(links.length, 'connector', 'connectors')}
                onPick={(role, value) => setAppearanceOnCells(graph, links, role, value)}
            />
        </div>
    );
}

/**
 * One kind's section. Renders nothing when none of that kind is selected, so a
 * selection of shapes alone looks as it did before connectors joined in.
 */
function BulkSection({ cells, labels, summary, onPick }: {
    cells: (BpmnElement | BpmnLink)[];
    labels: Partial<Record<AppearanceRole, string>>;
    summary: string;
    onPick: (role: AppearanceRole, color: string) => void;
}) {
    if (cells.length === 0) return null;

    // A role the kind has no name for is not its business — a connector has no
    // fill, whatever a shape in the same selection may have.
    const rows = sharedRoles(cells)
        .map((role) => ({ role, label: labels[role] }))
        .filter((row): row is { role: AppearanceRole, label: string } => !!row.label);

    return (
        <div className="bulk-section">
            <p className="bulk-summary">{summary}</p>
            {rows.length === 0
                ? <p className="bulk-empty">These have nothing in common to change.</p>
                : rows.map(({ role, label }) => {
                    const value = sharedValue(cells, role);
                    // Every cell has this role, so the first one's field says
                    // which control it takes.
                    const field = fieldFor(cells[0], role);

                    if (field?.type === 'select-box') {
                        return (
                            <AppearanceSelect
                                key={role}
                                label={label}
                                value={value}
                                options={field.options}
                                hint={value === null ? 'Mixed' : undefined}
                                onPick={(picked) => onPick(role, picked)}
                            />
                        );
                    }

                    return (
                        <ColorSwatches
                            key={role}
                            label={label}
                            value={value}
                            hint={value === null ? 'Mixed' : undefined}
                            onPick={(picked) => onPick(role, picked)}
                        />
                    );
                })}
        </div>
    );
}
