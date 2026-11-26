import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useCells, useGraph, type CellId, type CellRecord, type Computed } from '@joint/react-plus';
import { CONNECTIONS, isConnectionData, withConnectionLook, type Arrowhead, type ConnectionData, type Routing } from '../connections/connections';
import { isLayer, LAYER_NAMES, LAYERS, type Layer } from '../plant/layers';
import { specOf } from '../shapes/registry';
import { isShapeData } from '../shapes/shape-data';
import { isFinish, isOutlineWidth, OUTLINE_WIDTHS, useDiagramStyle, type CellStyle, type Finish, type OutlineWidth } from '../shapes/style';
import type { ColorField as ShapeColorField, PlantValues, ShapeData, ShapeLabel, TextAlign, TextStyle } from '../shapes/types';
import { ButtonGroupField, ColorField, FieldGroup, NumberField, RangeField, SelectField, SideField, TextField, ToggleField, type Choice } from './fields';
import { nextTag, seriesOf } from './new-cells';
import { withoutKey } from './objects';

/** One selected cell as the inspector reads it: its id, layer and data. */
interface Inspected {
    readonly id: CellId;
    readonly isLink: boolean;
    readonly layer: Layer;
    readonly data: ShapeData;
}

/** The selected cells' records: the same array while none of them changes (their records are shared). */
const selectInspected = (cells: ReadonlyArray<Computed<CellRecord>>): readonly Inspected[] =>
    cells.flatMap((cell) => (isShapeData(cell.data) ? [{ id: cell.id, isLink: cell.type === 'link', layer: isLayer(cell.layer) ? cell.layer : 'cells', data: cell.data }] : []));
const isSameInspected = (a: readonly Inspected[], b: readonly Inspected[]) =>
    a.length === b.length && a.every((cell, index) => cell.data === b[index].data && cell.layer === b[index].layer);

const FINISHES: ReadonlyArray<Choice<'auto' | Finish>> = [
    { value: 'auto', label: 'Auto' },
    { value: 'shaded', label: 'Shaded' },
    { value: 'flat', label: 'Flat' },
];
const OUTLINE_WIDTH_CHOICES: ReadonlyArray<Choice<'auto' | OutlineWidth>> = [
    { value: 'auto', label: 'Auto' },
    ...(['thin', 'normal', 'thick'] as const).map((width) => ({ value: width, label: OUTLINE_WIDTHS[width].name })),
];
/** The outline width a cell has, Auto when it has none (or not one of the widths). */
const outlineWidthOrAuto = (value: unknown): 'auto' | OutlineWidth => (isOutlineWidth(value) ? value : 'auto');

const ROUTINGS: ReadonlyArray<Choice<Routing>> = [
    { value: 'straight', label: 'Straight' },
    { value: 'orthogonal', label: 'Orthogonal' },
    { value: 'smooth', label: 'Curved' },
];
const ARROWHEADS: ReadonlyArray<Choice<Arrowhead>> = [
    { value: 'none', label: 'None' },
    { value: 'arrow', label: 'Arrow' },
    { value: 'open', label: 'Open' },
    { value: 'circle', label: 'Circle' },
    { value: 'diamond', label: 'Diamond' },
];
const TEXT_STYLES: ReadonlyArray<Choice<TextStyle>> = [
    { value: 'italic', label: 'I', name: 'Italic' },
    { value: 'underline', label: 'U', name: 'Underline' },
    { value: 'line-through', label: 'S', name: 'Strikethrough' },
];
const TEXT_ALIGNS: ReadonlyArray<Choice<TextAlign>> = [
    { value: 'left', label: 'Left' },
    { value: 'middle', label: 'Center' },
    { value: 'right', label: 'Right' },
];
const LAYER_CHOICES = LAYERS.map((layer) => ({ value: layer, label: LAYER_NAMES[layer] }));
// The shapes whose value is a reading on a scale (0 - 100 %), and their names for it.
const SCALE_LABELS: Readonly<Record<string, string>> = { Thermometer: 'Temperature', PressureGauge: 'Pressure' };
const READINGS = new Set(['Display', 'FlowMeter', 'ElectricMeter']);
// The default opacity of the shapes that have one.
const OPACITY_DEFAULTS: Readonly<Record<string, number>> = { Rectangle: 0.3, Ellipse: 0.3, CustomImage: 1 };

/** The value all the cells share, or `undefined` when they differ (mixed). */
function shared<T>(cells: readonly Inspected[], read: (data: ShapeData) => T): T | undefined {
    const first = read(cells[0].data);
    return cells.every((cell) => Object.is(read(cell.data), first)) ? first : undefined;
}

/** The color fields of a cell: of its kind, or of its connection's kind. */
function colorFieldsOf(data: ShapeData): readonly [ShapeColorField | null, ShapeColorField | null, ShapeColorField | null, boolean] {
    if (isConnectionData(data)) {
        const spec = CONNECTIONS[data.kind];
        return [spec.colorField, spec.outlineField, spec.accentField, false];
    }
    const spec = specOf(data.kind);
    return spec ? [spec.colorField, spec.outlineField, spec.accentField, spec.hasFinish] : [null, null, null, false];
}

/** The edits of the selected cells: each one undo step. A link's look follows its data. */
function useWrite(cells: readonly Inspected[]) {
    const { setCell, setCellData, transaction } = useGraph();
    const writeData = (update: (data: ShapeData) => ShapeData) => transaction(() => {
        for (const cell of cells) {
            if (cell.isLink) {
                setCell(cell.id, (previous) => withConnectionLook({ ...previous, data: update(cell.data) }));
            } else {
                setCellData(cell.id, () => update(cell.data));
            }
        }
    }, { name: 'inspect' });
    const writeStyle = (key: keyof CellStyle, value: CellStyle[keyof CellStyle]) => writeData((data) => {
        const rest = withoutKey(data.style ?? {}, key);
        const style: CellStyle = value === undefined ? rest : { ...rest, [key]: value };
        return { ...data, style };
    });
    const writePlant = (patch: Partial<PlantValues>) => writeData((data) => ({ ...data, plant: { ...data.plant, ...patch } }));
    const writeLabel = (patch: Partial<ShapeLabel>) => writeData((data) => ({ ...data, label: { ...data.label, ...patch } }));
    const writeLayer = (layer: Layer) => transaction(() => {
        for (const cell of cells) {
            setCell(cell.id, (previous) => ({ ...previous, layer }));
        }
    }, { name: 'layer' });
    return { writeData, writeStyle, writePlant, writeLabel, writeLayer };
}

/** The appearance of the cells: finish, colors, outline width, label position and offset, layer. */
function AppearanceFields({ cells }: { readonly cells: readonly Inspected[] }) {
    const diagram = useDiagramStyle();
    const { writeStyle, writeLabel, writeLayer } = useWrite(cells);
    const fields = cells.map((cell) => colorFieldsOf(cell.data));
    const hasColor = fields.every(([color]) => color !== null);
    const hasOutline = fields.every(([, outline]) => outline !== null);
    const hasAccent = fields.every(([, , accent]) => accent !== null);
    const hasFinish = fields.every(([, , , finish]) => finish);
    const style = (key: keyof CellStyle) => shared(cells, (data) => data.style?.[key]);
    const isMixed = (key: keyof CellStyle) => !cells.every((cell) => Object.is(cell.data.style?.[key], cells[0].data.style?.[key]));
    const finish = style('finish');
    // The outline width shows while the cells are outlined: an outline of their own, or flat.
    const isOutlined = cells.every((cell) => Boolean(cell.data.style?.outline) || (cell.data.style?.finish ?? diagram.finish) === 'flat');
    const hasLabels = cells.every((cell) => cell.data.label?.position !== undefined && (cell.data.label.text ?? '').trim() !== '');
    const opacityDefault = shared(cells, (data) => OPACITY_DEFAULTS[data.kind]);
    const opacity = shared(cells, (data) => data.style?.opacity ?? OPACITY_DEFAULTS[data.kind]);
    return (
        <FieldGroup title="Appearance">
            {hasFinish && <ButtonGroupField label="Finish" value={isMixed('finish') ? undefined : isFinish(finish) ? finish : 'auto'} choices={FINISHES} onCommit={(value) => writeStyle('finish', value === 'auto' ? undefined : value)} />}
            {hasColor && <ColorField label="Color" value={typeof style('color') === 'string' ? String(style('color')) : undefined} isMixed={isMixed('color')} onCommit={(value) => writeStyle('color', value)} />}
            {hasOutline && <ColorField label="Outline" value={typeof style('outline') === 'string' ? String(style('outline')) : undefined} isMixed={isMixed('outline')} onCommit={(value) => writeStyle('outline', value)} />}
            {hasOutline && isOutlined && (
                <ButtonGroupField label="Outline width" value={isMixed('outlineWidth') ? undefined : (outlineWidthOrAuto(style('outlineWidth')))} choices={OUTLINE_WIDTH_CHOICES} onCommit={(value) => writeStyle('outlineWidth', value === 'auto' ? undefined : value)} />
            )}
            {hasAccent && <ColorField label="Accent" value={typeof style('accent') === 'string' ? String(style('accent')) : undefined} isMixed={isMixed('accent')} onCommit={(value) => writeStyle('accent', value)} />}
            {opacityDefault !== undefined && opacity !== undefined && (
                <RangeField label="Opacity" value={opacity} min={0} max={1} step={0.05} format={(value) => `${Math.round(value * 100)}%`} onCommit={(value) => writeStyle('opacity', value)} />
            )}
            {hasLabels && (
                <>
                    <SideField label="Label position" value={shared(cells, (data) => data.label?.position)} onCommit={(position) => writeLabel({ position })} />
                    <NumberField label="Label offset" value={shared(cells, (data) => data.label?.offset ?? 0)} min={0} max={200} step={2} onCommit={(offset) => writeLabel({ offset: offset ?? 0 })} />
                </>
            )}
            <SelectField label="Layer" value={shared(cells, () => undefined) ?? (cells.every((cell) => cell.layer === cells[0].layer) ? cells[0].layer : undefined)} choices={LAYER_CHOICES} onCommit={writeLayer} />
        </FieldGroup>
    );
}

/** The ID of a cell: optional, unique; *Generate* gives the next free one of its series. */
function TagField({ cell, allTags }: { readonly cell: Inspected; readonly allTags: readonly string[] }) {
    const { writeData } = useWrite([cell]);
    const [error, setError] = useState<string | undefined>(undefined);
    const prefix = isConnectionData(cell.data) ? CONNECTIONS[cell.data.kind].tagPrefix : specOf(cell.data.kind)?.tagPrefix ?? null;
    const others = allTags.filter((tag) => tag !== cell.data.tag);
    const commit = (tag: string) => {
        if (tag !== '' && others.includes(tag)) {
            setError(`${tag} is the ID of another shape.`);
            return;
        }
        setError(undefined);
        writeData((data) => (tag === '' ? { ...withoutKey(data, 'tag'), kind: data.kind } : { ...data, tag }));
    };
    const series = (cell.data.tag && seriesOf(cell.data.tag)) || prefix || 'ID';
    return (
        <TextField label="ID" value={cell.data.tag} placeholder="none" error={error} onCommit={commit}>
            {!cell.data.tag && <button type="button" className="key h-9 shrink-0" onClick={() => commit(nextTag(series, others))}>Generate</button>}
        </TextField>
    );
}

const selectTags = (cells: ReadonlyArray<Computed<CellRecord>>): string =>
    cells.flatMap((cell) => (isShapeData(cell.data) && cell.data.tag ? [cell.data.tag] : [])).sort().join('\n');

/** The fields of one element: its texts, its values, its controls. */
function ElementFields({ cell }: { readonly cell: Inspected }) {
    const { writeData, writePlant, writeLabel } = useWrite([cell]);
    const { data } = cell;
    const plant = data.plant ?? {};
    const isLabelShape = data.kind === 'Label';
    const hasOwnText = isLabelShape || data.kind === 'Zone';
    const text = (key: 'function' | 'loop' | 'unit') => (typeof data[key] === 'string' ? String(data[key]) : undefined);
    const spec = specOf(data.kind);
    return (
        <>
            <FieldGroup title="General">
                {data.label !== undefined && (
                    <TextField label={hasOwnText ? 'Text' : 'Name'} value={data.label.text} isMultiline={isLabelShape} onCommit={(value) => writeLabel({ text: value })} />
                )}
                {text('function') !== undefined && <TextField label="Function" value={text('function')} onCommit={(value) => writeData((previous) => ({ ...previous, function: value }))} />}
                {text('loop') !== undefined && <TextField label="Loop" value={text('loop')} onCommit={(value) => writeData((previous) => ({ ...previous, loop: value }))} />}
                {isLabelShape && (
                    <>
                        <NumberField label="Font size" value={data.label?.size} min={8} max={96} onCommit={(size) => writeLabel({ size })} />
                        <ButtonGroupField label="Font weight" value={String(data.label?.weight ?? 400)} choices={[{ value: '400', label: 'Normal' }, { value: '700', label: 'Bold' }]} onCommit={(weight) => writeLabel({ weight: Number(weight) })} />
                        <div className="flex gap-1" role="group" aria-label="Font style">
                            {TEXT_STYLES.map((choice) => {
                                const styles = data.label?.styles ?? [];
                                const isOn = styles.includes(choice.value);
                                return (
                                    <button key={choice.value} type="button" aria-pressed={isOn} aria-label={choice.name} title={choice.name} className={`key h-8 w-9 ${isOn ? 'key-primary' : ''}`} onClick={() => writeLabel({ styles: isOn ? styles.filter((style) => style !== choice.value) : [...styles, choice.value] })}>
                                        {choice.label}
                                    </button>
                                );
                            })}
                        </div>
                        <ButtonGroupField label="Alignment" value={data.label?.align ?? 'middle'} choices={TEXT_ALIGNS} onCommit={(align) => writeLabel({ align })} />
                    </>
                )}
            </FieldGroup>
            <FieldGroup title="Values">
                {plant.power !== undefined && <ToggleField label="Power" value={Boolean(plant.power)} onCommit={(isOn) => writePlant({ power: isOn ? 1 : 0 })} />}
                {typeof plant.open === 'boolean' && <ToggleField label="Open" value={plant.open} onCommit={(open) => writePlant({ open })} />}
                {typeof plant.open === 'number' && <RangeField label="Open" value={plant.open} min={0} max={1} step={0.25} format={(value) => `${Math.round(value * 100)}%`} onCommit={(open) => writePlant({ open })} />}
                {plant.level !== undefined && <RangeField label="Level" value={plant.level} min={0} max={100} step={1} unit="%" onCommit={(level) => writePlant({ level })} />}
                {SCALE_LABELS[data.kind] && <RangeField label={SCALE_LABELS[data.kind]} value={Number(plant.value) || 0} min={0} max={100} step={1} unit="%" onCommit={(value) => writePlant({ value })} />}
                {(READINGS.has(data.kind) || data.kind === 'GaugeChart') && <NumberField label="Value" value={Number(plant.value) || 0} step={0.1} onCommit={(value) => writePlant({ value: value ?? 0 })} />}
                {['GaugeChart', 'LineChart', 'BarChart'].includes(data.kind) && (
                    <>
                        <NumberField label="Min" value={plant.min} onCommit={(min) => writePlant({ min })} />
                        <NumberField label="Max" value={plant.max} onCommit={(max) => writePlant({ max })} />
                    </>
                )}
                {text('unit') !== undefined && <TextField label="Unit" value={text('unit')} onCommit={(value) => writeData((previous) => ({ ...previous, unit: value }))} />}
            </FieldGroup>
            {plant.thresholds !== undefined && (
                <FieldGroup title="Thresholds">
                    {data.kind === 'LineChart' ? (
                        <>
                            <NumberField label="Low (warn below)" value={plant.thresholds.low} onCommit={(low) => writePlant({ thresholds: { ...plant.thresholds, low } })} />
                            <NumberField label="High (warn above)" value={plant.thresholds.high} onCommit={(high) => writePlant({ thresholds: { ...plant.thresholds, high } })} />
                        </>
                    ) : (
                        <>
                            <RangeField label="Low (warn below)" value={plant.thresholds.low ?? 0} min={0} max={100} step={1} unit="%" onCommit={(low) => writePlant({ thresholds: { ...plant.thresholds, low } })} />
                            <RangeField label="High (warn above)" value={plant.thresholds.high ?? 100} min={0} max={100} step={1} unit="%" onCommit={(high) => writePlant({ thresholds: { ...plant.thresholds, high } })} />
                        </>
                    )}
                </FieldGroup>
            )}
            {spec?.control && (
                <FieldGroup title="Controls">
                    <ToggleField label="Use controls" value={data.controls !== false} onCommit={(isUsed) => writeData((previous) => ({ ...previous, controls: isUsed }))} />
                    {data.controls !== false && (
                        <SideField label="Control position" value={typeof data.controlPosition === 'string' ? data.controlPosition : undefined} onCommit={(controlPosition) => writeData((previous) => ({ ...previous, controlPosition }))} />
                    )}
                </FieldGroup>
            )}
        </>
    );
}

/** The fields of one connection: its routing, size, arrowheads, power. */
function ConnectionFields({ cell, data }: { readonly cell: Inspected; readonly data: ConnectionData }) {
    const { writeData, writeStyle, writePlant } = useWrite([cell]);
    const spec = CONNECTIONS[data.kind];
    const isSize = spec.lineWidth === 'size';
    return (
        <FieldGroup title={spec.title}>
            <ButtonGroupField label="Routing" value={data.routing ?? spec.routing} choices={ROUTINGS} onCommit={(routing) => writeData((previous) => ({ ...previous, routing }))} />
            {spec.lineWidth && (
                <ButtonGroupField
                    label={isSize ? 'Size' : 'Thickness'}
                    value={data.style?.lineWidth ?? 'normal'}
                    choices={[
                        { value: 'thin', label: isSize ? 'Small' : 'Thin' },
                        { value: 'normal', label: isSize ? 'Medium' : 'Normal' },
                        { value: 'thick', label: isSize ? 'Large' : 'Thick' },
                    ]}
                    onCommit={(lineWidth) => writeStyle('lineWidth', lineWidth)}
                />
            )}
            {data.kind === 'Arrow' && (
                <>
                    <ButtonGroupField label="Start" value={data.sourceArrowhead ?? 'none'} choices={ARROWHEADS} onCommit={(sourceArrowhead) => writeData((previous) => ({ ...previous, sourceArrowhead }))} />
                    <ButtonGroupField label="End" value={data.targetArrowhead ?? 'arrow'} choices={ARROWHEADS} onCommit={(targetArrowhead) => writeData((previous) => ({ ...previous, targetArrowhead }))} />
                </>
            )}
            {data.plant?.power !== undefined && <ToggleField label="Power" value={Boolean(data.plant.power)} onCommit={(isOn) => writePlant({ power: isOn ? 1 : 0 })} />}
        </FieldGroup>
    );
}

/** The inspector of the selection: one cell's fields, or the appearance of several at once (`mixed` where they differ). */
export function ShapeInspector({ ids }: { readonly ids: readonly CellId[] }) {
    const { removeCells } = useGraph();
    const cells = useCells(ids, selectInspected, isSameInspected);
    const tags = useCells(selectTags);
    if (cells.length === 0) {
        return null;
    }
    const [first] = cells;
    const isSingle = cells.length === 1;
    const connection = isSingle && isConnectionData(first.data) ? first.data : undefined;
    const spec = specOf(first.data.kind);
    const title = isSingle ? (connection ? CONNECTIONS[connection.kind].title : spec?.title ?? first.data.kind) : `${cells.length} selected`;
    const isTaggable = isSingle && (first.data.tag !== undefined || (connection ? CONNECTIONS[connection.kind].tagPrefix : spec?.tagPrefix) != null);
    return (
        <div key={ids.join(' ')} className="inspector-enter grid gap-5 p-4">
            <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
                {isSingle && spec && <p className="text-sm text-muted">{spec.description}</p>}
            </div>
            {isTaggable && <TagField cell={first} allTags={tags === '' ? [] : tags.split('\n')} />}
            {isSingle && connection && <ConnectionFields cell={first} data={connection} />}
            {isSingle && !connection && first.data.kind !== 'Group' && <ElementFields cell={first} />}
            <AppearanceFields cells={cells} />
            <button type="button" className="key justify-self-start" onClick={() => removeCells([...ids])}>
                <Trash2 className="size-4" aria-hidden /> Delete
            </button>
        </div>
    );
}
