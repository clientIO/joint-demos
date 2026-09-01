import { useEffect, useId, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { useCells } from '@joint/react-plus';
import { PALETTE } from '../../configs/palette';
import { readFieldValue } from '../../utils';

import type { CellRecord, Computed } from '@joint/react-plus';
import type { AppElement, AppLink, AppearanceColorField, AppearanceSelectBoxField, AppearanceSelectOption } from '../../shapes/shapes-typing';

type Cell = AppElement | AppLink;

// The cell's reactive record: a new snapshot on every model change (attribute
// updates, undo/redo, ...) — used as an effect dependency to resync fields.
type CellSnapshot = Computed<CellRecord> | undefined;

/**
 * A row of theme palette swatches (each value is a CSS variable, so the diagram
 * re-colors with the theme).
 *
 * `value` is `null` where there is no one value to show — several shapes are
 * selected and they disagree — and then no swatch reads as selected, which is
 * the whole of the visual answer. An empty radio group is silent though, so
 * `hint` says why for assistive tech.
 */
export function ColorSwatches({ label, value, hint, onPick }: {
    label: string;
    value: string | null;
    hint?: string;
    onPick: (color: string) => void;
}) {
    // `aria-checked="mixed"` is not available to `role="radio"` — only
    // checkboxes and tree items have it — so the mixed state is conveyed by
    // leaving every radio unchecked and describing the group.
    const id = useId();
    const hintId = hint ? `swatches-hint-${id}` : undefined;

    return (
        <div className="field color-field">
            <div className="swatches" role="radiogroup" aria-label={label} aria-describedby={hintId}>
                {PALETTE.map((color) => (
                    <button
                        key={color.value}
                        type="button"
                        role="radio"
                        aria-checked={value === color.value}
                        aria-label={color.label}
                        title={color.label}
                        className={`swatch${value === color.value ? ' selected' : ''}`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => onPick(color.value)}
                    />
                ))}
            </div>
            <label>{label}</label>
            {hint && <span id={hintId} className="sr-only">{hint}</span>}
        </div>
    );
}

/**
 * Color field for a single cell.
 */
function ColorField({ cell, field, snapshot }: { cell: Cell; field: AppearanceColorField; snapshot: CellSnapshot }) {
    const [value, setValue] = useState(() => readFieldValue(cell, field));

    // Sync from the model on external changes (undo/redo, shape morph).
    useEffect(() => {
        setValue(readFieldValue(cell, field));
    }, [cell, field.path, snapshot]);

    const onPick = (color: string) => {
        setValue(color);
        cell.prop(field.path, color);
    };

    return <ColorSwatches label={field.label} value={value} onPick={onPick} />;
}

/**
 * A select box.
 *
 * `value` is `null` where there is no one value to show — several cells are
 * selected and they disagree — and then it reads as a dash rather than an empty
 * box, which would look like a control that failed to load. A dash says nothing
 * to a screen reader though, so `hint` says why for anything listening.
 */
export function AppearanceSelect({ label, value, options, hint, onPick }: {
    label: string;
    value: string | null;
    options: AppearanceSelectOption[];
    hint?: string;
    onPick: (value: string) => void;
}) {
    const id = useId();
    const hintId = hint ? `select-hint-${id}` : undefined;

    return (
        <div className="field select-box-field">
            <label>{label}</label>
            {hint && <span id={hintId} className="sr-only">{hint}</span>}
            <Select.Root value={value ?? undefined} onValueChange={onPick}>
                <Select.Trigger className="select-box-trigger" aria-label={label} aria-describedby={hintId}>
                    <Select.Value placeholder="--" />
                    <Select.Icon>
                        <ChevronDown size={14} />
                    </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content className="select-box-content" position="popper" sideOffset={4}>
                        <Select.Viewport>
                            {options.map((option) => (
                                <Select.Item key={String(option.value)} value={String(option.value)} className="select-box-item">
                                    <Select.ItemText>{option.label}</Select.ItemText>
                                    <Select.ItemIndicator>
                                        <Check size={13} />
                                    </Select.ItemIndicator>
                                </Select.Item>
                            ))}
                        </Select.Viewport>
                    </Select.Content>
                </Select.Portal>
            </Select.Root>
        </div>
    );
}

/**
 * Select-box field for a single cell, preserving the option's own value type.
 */
function SelectBoxField({ cell, field, snapshot }: { cell: Cell; field: AppearanceSelectBoxField; snapshot: CellSnapshot }) {
    const [value, setValue] = useState(() => readFieldValue(cell, field));

    useEffect(() => {
        setValue(readFieldValue(cell, field));
    }, [cell, field.path, snapshot]);

    const onValueChange = (selected: string) => {
        // Preserve the original option type (e.g. numeric font sizes).
        const option = field.options.find((opt) => String(opt.value) === selected);
        setValue(selected);
        cell.prop(field.path, option?.value ?? selected);
    };

    return (
        <AppearanceSelect
            label={field.label}
            value={value}
            options={field.options}
            onPick={onValueChange}
        />
    );
}

/**
 * The Appearance inspector tab, rendered from the shape's appearance config.
 */
export function AppearanceForm({ cell }: { cell: Cell }) {
    const snapshot = useCells(cell.id);

    return (
        <div className="appearance-form">
            {cell.getAppearanceConfig().map((group, index) => {
                if (group.visibleWhen && !group.visibleWhen(cell)) return null;

                return (
                    <div key={group.label ?? index} className="group" data-name={group.label}>
                        {group.label && <h2 className="group-label">{group.label}</h2>}
                        {group.fields.map((field) => (
                            field.type === 'color'
                                ? <ColorField key={field.path} cell={cell} field={field} snapshot={snapshot} />
                                : <SelectBoxField key={field.path} cell={cell} field={field} snapshot={snapshot} />
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
