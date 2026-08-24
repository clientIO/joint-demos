import { useEffect, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { useCells } from '@joint/react-plus';
import { PALETTE } from '../../configs/palette';

import type { CellRecord, Computed } from '@joint/react-plus';
import type { AppElement, AppLink, AppearanceColorField, AppearanceSelectBoxField } from '../../shapes/shapes-typing';

type Cell = AppElement | AppLink;

// The cell's reactive record: a new snapshot on every model change (attribute
// updates, undo/redo, ...) — used as an effect dependency to resync fields.
type CellSnapshot = Computed<CellRecord> | undefined;

/**
 * The cell's current value at the field's path (or the field default).
 */
function readValue(cell: Cell, field: { path: string; defaultValue?: string | number }): string {
    const value = cell.prop(field.path) ?? field.defaultValue ?? '';
    return String(value);
}

/**
 * Color field: a row of theme palette swatches (each value is a CSS
 * variable, so the diagram re-colors with the theme).
 */
function ColorField({ cell, field, snapshot }: { cell: Cell; field: AppearanceColorField; snapshot: CellSnapshot }) {
    const [value, setValue] = useState(() => readValue(cell, field));

    // Sync from the model on external changes (undo/redo, shape morph).
    useEffect(() => {
        setValue(readValue(cell, field));
    }, [cell, field.path, snapshot]);

    const onPick = (color: string) => {
        setValue(color);
        cell.prop(field.path, color);
    };

    return (
        <div className="field color-field">
            <div className="swatches" role="radiogroup" aria-label={field.label}>
                {PALETTE.map((color) => (
                    <button
                        key={color.value}
                        type="button"
                        role="radio"
                        aria-checked={value === color.value}
                        title={color.label}
                        className={`swatch${value === color.value ? ' selected' : ''}`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => onPick(color.value)}
                    />
                ))}
            </div>
            <label>{field.label}</label>
        </div>
    );
}

/**
 * Select-box field preserving the original option value type.
 */
function SelectBoxField({ cell, field, snapshot }: { cell: Cell; field: AppearanceSelectBoxField; snapshot: CellSnapshot }) {
    const [value, setValue] = useState(() => readValue(cell, field));

    useEffect(() => {
        setValue(readValue(cell, field));
    }, [cell, field.path, snapshot]);

    const onValueChange = (selected: string) => {
        // Preserve the original option type (e.g. numeric font sizes).
        const option = field.options.find((opt) => String(opt.value) === selected);
        setValue(selected);
        cell.prop(field.path, option?.value ?? selected);
    };

    return (
        <div className="field select-box-field">
            <label>{field.label}</label>
            <Select.Root value={value} onValueChange={onValueChange}>
                <Select.Trigger className="select-box-trigger" aria-label={field.label}>
                    <Select.Value />
                    <Select.Icon>
                        <ChevronDown size={14} />
                    </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content className="select-box-content" position="popper" sideOffset={4}>
                        <Select.Viewport>
                            {field.options.map((option) => (
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
                        {group.label && <h3 className="group-label">{group.label}</h3>}
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
