import { X } from 'lucide-react';
import { useCells, useGraph, type CellRecord, type Computed } from '@joint/react-plus';
import { SCREEN } from '../shapes/diagram';
import { isShapeData } from '../shapes/shape-data';
import { LABEL_SIZES, OUTLINE_WIDTHS, type DiagramStyle, type LabelContent, type LabelSize, type OutlineWidth } from '../shapes/style';
import { useDiagramMeta } from './diagram-meta';
import { CANVAS_COLORS, THEME_COLORS } from './colors';
import { ButtonGroupField, ColorField, FieldGroup, NumberField, ToggleField } from './fields';
import { withoutKey } from './objects';
import { createShape } from './new-cells';
import { usePreferences } from './preferences';

// The screen's size limits (px).
const MIN_SCREEN_SIZE = 200;
const MAX_SCREEN_SIZE = 10000;

/** The screen of the diagram (one at most): its id and size, as one string so the panel re-renders only when it changes. */
const selectScreen = (cells: ReadonlyArray<Computed<CellRecord>>): string => {
    const screen = cells.find((cell) => cell.type === 'element' && isShapeData(cell.data) && cell.data.kind === 'Screen');
    return screen && screen.type === 'element' ? `${screen.id} ${screen.size?.width ?? 0} ${screen.size?.height ?? 0}` : '';
};

/** The settings of the diagram (the screen, the style, the animations, saved with it) and of the editor (this browser). */
export function DiagramSettings({ onClose }: { readonly onClose: () => void }) {
    const { meta, updateMeta } = useDiagramMeta();
    const [preferences, setPreferences] = usePreferences();
    const { removeCells, setCell } = useGraph();
    const screen = useCells(selectScreen);
    const [screenId, width, height] = screen === '' ? [undefined, SCREEN.size.width, SCREEN.size.height] : screen.split(' ').map((part, index) => (index === 0 ? part : Number(part)));
    const { style } = meta;
    const setStyle = <K extends keyof DiagramStyle>(key: K, value: DiagramStyle[K]) => updateMeta((previous) => {
        const rest = withoutKey(previous.style, key);
        return { ...previous, style: value === undefined ? rest : { ...rest, [key]: value } };
    });
    const resizeScreen = (size: { readonly width?: number; readonly height?: number }) => {
        if (typeof screenId !== 'string') {
            return;
        }
        const clamp = (value: number) => Math.max(MIN_SCREEN_SIZE, Math.min(MAX_SCREEN_SIZE, Math.round(value)));
        setCell(screenId, (previous) => (previous.type === 'element' ? { ...previous, size: { width: clamp(size.width ?? Number(width)), height: clamp(size.height ?? Number(height)) } } : previous));
    };
    return (
        <div className="grid gap-5 p-4">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-tight text-ink">Settings</h2>
                <button type="button" className="key" aria-label="Close the settings" onClick={onClose}><X className="size-4" aria-hidden /></button>
            </div>
            <FieldGroup title="Screen">
                <ToggleField
                    label="Enabled"
                    value={screenId !== undefined}
                    onCommit={(isEnabled) => {
                        if (isEnabled) {
                            setCell({ ...createShape(SCREEN, { id: crypto.randomUUID() }), z: -1000 });
                        } else if (typeof screenId === 'string') {
                            removeCells([screenId]);
                        }
                    }}
                />
                {screenId !== undefined && (
                    <div className="grid grid-cols-2 gap-2">
                        <NumberField label="Width" value={Number(width)} min={MIN_SCREEN_SIZE} max={MAX_SCREEN_SIZE} step={10} onCommit={(value) => resizeScreen({ width: value })} />
                        <NumberField label="Height" value={Number(height)} min={MIN_SCREEN_SIZE} max={MAX_SCREEN_SIZE} step={10} onCommit={(value) => resizeScreen({ height: value })} />
                    </div>
                )}
            </FieldGroup>
            <FieldGroup title="Style">
                <ButtonGroupField label="Finish" value={style.finish ?? 'shaded'} choices={[{ value: 'shaded', label: 'Shaded' }, { value: 'flat', label: 'Flat' }]} onCommit={(finish) => setStyle('finish', finish === 'shaded' ? undefined : finish)} />
                <ColorField label="Color" value={style.color} onCommit={(value) => setStyle('color', value)} />
                <ColorField label="Outline" value={style.outline} onCommit={(value) => setStyle('outline', value)} />
                <ButtonGroupField
                    label="Outline width"
                    value={style.outlineWidth ?? 'normal'}
                    choices={(['thin', 'normal', 'thick'] as const).map((value) => ({ value, label: OUTLINE_WIDTHS[value].name }))}
                    onCommit={(value: OutlineWidth) => setStyle('outlineWidth', value === 'normal' ? undefined : value)}
                />
                <ColorField label="Accent" value={style.accent} onCommit={(value) => setStyle('accent', value)} />
                <ButtonGroupField<LabelContent>
                    label="Labels"
                    value={style.labels ?? 'name'}
                    choices={[{ value: 'name', label: 'Name' }, { value: 'tag', label: 'ID' }, { value: 'both', label: 'ID + name' }]}
                    onCommit={(labels) => setStyle('labels', labels === 'name' ? undefined : labels)}
                />
                <ButtonGroupField<LabelSize>
                    label="Label size"
                    value={style.labelSize ?? 'medium'}
                    choices={(['small', 'medium', 'large', 'x-large'] as const).map((value) => ({ value, label: LABEL_SIZES[value].name }))}
                    onCommit={(labelSize) => setStyle('labelSize', labelSize === 'medium' ? undefined : labelSize)}
                />
                <ColorField label="Label color" value={style.labelColor} swatches={THEME_COLORS} onCommit={(value) => setStyle('labelColor', value)} />
                <ColorField label="Canvas" value={style.canvas} swatches={CANVAS_COLORS} onCommit={(value) => setStyle('canvas', value)} />
                <ToggleField label="Canvas gradient" value={style.canvasGradient === true} onCommit={(isOn) => setStyle('canvasGradient', isOn || undefined)} />
            </FieldGroup>
            <FieldGroup title="Run mode">
                <ButtonGroupField label="Animations" value={meta.animations} choices={[{ value: 'full', label: 'Full' }, { value: 'alarms', label: 'Alarms only' }]} onCommit={(animations) => updateMeta((previous) => ({ ...previous, animations }))} />
            </FieldGroup>
            <FieldGroup title="Editor">
                <ToggleField label="Snaplines" value={preferences.snaplines} onCommit={(snaplines) => setPreferences({ snaplines })} />
                <ToggleField label="In Use group" value={preferences.inUseGroup} onCommit={(inUseGroup) => setPreferences({ inUseGroup })} />
                <ToggleField label="Move selected shapes only" value={preferences.moveSelectedOnly} onCommit={(moveSelectedOnly) => setPreferences({ moveSelectedOnly })} />
            </FieldGroup>
        </div>
    );
}
