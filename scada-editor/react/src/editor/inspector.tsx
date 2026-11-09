import { useId, useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import {
    useCell,
    useCells,
    useGraph,
    useSelectionCollection,
    type CellId,
    type Computed,
    type CellRecord,
} from '@joint/react-plus';
import { pipeLook } from '../plant/cells';
import { tagsInUse } from '../plant/use-unique-tags';
import { isEquipmentData, isPipeData, type EquipmentData, type Medium } from '../plant/model';
import { CATALOG } from '../shapes/catalog';
import { isSameIds, selectData } from './selectors';

const PIPE_MEDIA: readonly Medium[] = ['water', 'steam', 'fuel', 'air'];
const MEDIUM_NAMES: Record<Medium, string> = { water: 'Water', steam: 'Steam', fuel: 'Fuel oil', air: 'Air', power: 'Power' };

const selectIds = (cells: ReadonlyArray<Computed<CellRecord>>): readonly CellId[] => cells.map((cell) => cell.id);
// All the tags as one string: a primitive, so the inspector re-renders only when a tag changes.
const selectTags = (cells: ReadonlyArray<Computed<CellRecord>>): string =>
    cells.flatMap((cell) => (isEquipmentData(cell.data) ? [cell.data.tag] : [])).sort().join('\n');

function Field({ label, children }: { readonly label: string; readonly children: (id: string) => ReactNode }) {
    const id = useId();
    return (
        <div className="grid gap-1.5">
            <label htmlFor={id} className="font-display text-sm font-medium text-muted">{label}</label>
            {children(id)}
        </div>
    );
}

interface TextFieldProps {
    readonly label: string;
    readonly value: string;
    readonly onCommit: (value: string) => void;
    /** Why the last value typed was refused, shown under the field. */
    readonly error?: string;
}

function TextField({ label, value, onCommit, error }: TextFieldProps) {
    // Committed on blur or Enter: one undo step per edit, not one per keystroke.
    return (
        <Field label={label}>
            {(id) => (
                <>
                    <input
                        id={id}
                        aria-invalid={error !== undefined}
                        key={value}
                        defaultValue={value}
                        className="field"
                        onBlur={(event) => {
                            const next = event.target.value.trim();
                            if (next && next !== value) {
                                onCommit(next);
                            }
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.currentTarget.blur();
                            }
                        }}
                    />
                    {error && <p role="alert" className="text-sm text-error">{error}</p>}
                </>
            )}
        </Field>
    );
}

/** The tank's initial level: shown while dragged, written once on release (one undo step). */
function LevelField({ level, onCommit }: { readonly level: number; readonly onCommit: (level: number) => void }) {
    const [draft, setDraft] = useState<number | null>(null);
    const commit = () => {
        if (draft !== null && draft !== level) {
            onCommit(draft);
        }
        setDraft(null);
    };
    const shown = draft ?? level;
    return (
        <Field label={`Initial level, ${shown}%`}>
            {(fieldId) => (
                <input
                    id={fieldId}
                    type="range"
                    min={0}
                    max={100}
                    value={shown}
                    onChange={(event) => setDraft(Number(event.target.value))}
                    onPointerUp={commit}
                    onKeyUp={commit}
                    onBlur={commit}
                    className="accent-accent"
                />
            )}
        </Field>
    );
}

function EquipmentInspector({ id, data }: { readonly id: CellId; readonly data: EquipmentData }) {
    const { graph, setCellData, transaction } = useGraph();
    const [tagError, setTagError] = useState<string | undefined>(undefined);
    const tags = useCells(selectTags).split('\n').filter((tag) => tag !== data.tag);
    const spec = CATALOG[data.kind];
    const update = (patch: Partial<EquipmentData>) => setCellData(id, (previous) => ({ ...previous, ...patch }));

    // The plant addresses equipment by its tag: a tag stays unique, and the
    // instruments reading this one follow it to its new name (one undo step).
    const renameTag = (tag: string) => {
        if (tagsInUse(graph, id).has(tag)) {
            setTagError(`${tag} is the tag of another shape.`);
            return;
        }
        setTagError(undefined);
        transaction(() => {
            update({ tag });
            for (const element of graph.getElements()) {
                const other: unknown = element.get('data');
                if (isEquipmentData(other) && other.source === data.tag) {
                    setCellData(element.id, { ...other, source: tag });
                }
            }
        }, { name: 'rename-tag' });
    };

    return (
        <>
            <TextField label="Tag" value={data.tag} error={tagError} onCommit={renameTag} />
            <TextField label="Name" value={data.name} onCommit={(name) => update({ name })} />
            {spec.reads && (
                <Field label={spec.reads === 'alarm' ? 'Watches' : 'Reads'}>
                    {(fieldId) => (
                        <select id={fieldId} className="field" value={data.source ?? ''} onChange={(event) => update({ source: event.target.value || undefined })}>
                            <option value="">{spec.reads === 'alarm' ? 'Any alarm in the plant' : 'Nothing yet'}</option>
                            {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                        </select>
                    )}
                </Field>
            )}
            {(data.kind === 'tank' || data.kind === 'silo') && (
                <LevelField level={Math.round(data.level ?? 0)} onCommit={(level) => update({ level })} />
            )}
            {spec.control && (
                <label className="flex items-center gap-2 text-sm text-ink-2">
                    <input type="checkbox" checked={data.active === true} onChange={(event) => update({ active: event.target.checked })} className="size-4 accent-accent" />
                    {spec.control.on} at start
                </label>
            )}
        </>
    );
}

function PipeInspector({ id, medium }: { readonly id: CellId; readonly medium: Medium }) {
    const { setCell } = useGraph();
    if (medium === 'power') {
        return <p className="text-sm text-ink-2">An electrical wire between two terminals.</p>;
    }
    return (
        <Field label="Carries">
            {(fieldId) => (
                <select
                    id={fieldId}
                    className="field"
                    value={medium}
                    onChange={(event) => {
                        const next = PIPE_MEDIA.find((item) => item === event.target.value) ?? 'water';
                        setCell(id, (previous) => ({ ...previous, data: { medium: next }, ...pipeLook(next) }));
                    }}
                >
                    {PIPE_MEDIA.map((item) => <option key={item} value={item}>{MEDIUM_NAMES[item]}</option>)}
                </select>
            )}
        </Field>
    );
}

function SelectedCell({ id }: { readonly id: CellId }) {
    const data = useCell(id, selectData);
    if (isEquipmentData(data)) {
        return (
            <>
                <Heading title={data.name} detail={CATALOG[data.kind].name} />
                <EquipmentInspector id={id} data={data} />
            </>
        );
    }
    if (isPipeData(data)) {
        return (
            <>
                <Heading title={data.medium === 'power' ? 'Wire' : 'Pipe'} detail={MEDIUM_NAMES[data.medium]} />
                <PipeInspector id={id} medium={data.medium} />
            </>
        );
    }
    return null;
}

function Heading({ title, detail }: { readonly title: string; readonly detail: string }) {
    return (
        <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
            <p className="text-sm text-muted">{detail}</p>
        </div>
    );
}

/** Edits what is selected: one shape, one pipe, or several at once (delete only). */
export function Inspector() {
    const { collection } = useSelectionCollection();
    const { removeCells } = useGraph();
    const ids = useCells(collection, selectIds, isSameIds);

    if (ids.length === 0) {
        return (
            <div className="grid gap-2 p-4">
                <h2 className="font-display text-lg font-semibold tracking-tight text-ink">Nothing selected</h2>
                <p className="text-sm text-ink-2">
                    Drag equipment from the palette, then connect a stub to another stub to lay a pipe. Select a shape to set its tag and what it reads.
                </p>
                <p className="text-sm text-muted">Press Run to start the plant.</p>
            </div>
        );
    }
    return (
        <div className="grid gap-5 p-4">
            {ids.length === 1 ? (
                <div key={ids[0]} className="inspector-enter grid gap-5">
                    <SelectedCell id={ids[0]} />
                </div>
            ) : (
                <Heading title={`${ids.length} selected`} detail="Shapes and pipes" />
            )}
            <button type="button" className="key justify-self-start" onClick={() => removeCells(ids)}>
                <Trash2 className="size-4" aria-hidden /> Delete
            </button>
        </div>
    );
}
