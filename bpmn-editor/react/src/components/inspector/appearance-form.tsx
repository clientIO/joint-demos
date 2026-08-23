import { useEffect, useRef, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { useCells } from '@joint/react-plus';

import type { FormEvent } from 'react';
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
 * Color field: live-previews while picking (skipping the undo stack) and
 * commits the final value as a single undoable command.
 */
function ColorField({ cell, field, snapshot }: { cell: Cell; field: AppearanceColorField; snapshot: CellSnapshot }) {
    const [value, setValue] = useState(() => readValue(cell, field));
    const inputRef = useRef<HTMLInputElement | null>(null);
    // The value at the start of the current preview interaction — the commit
    // rewrites original -> final as a single undoable command.
    const originalRef = useRef(value);
    const syncedRef = useRef(true);

    // Sync from the model on external changes (undo/redo, shape morph).
    useEffect(() => {
        const modelValue = readValue(cell, field);
        setValue(modelValue);
        if (syncedRef.current) {
            originalRef.current = modelValue;
        }
    }, [cell, field.path, snapshot]);

    const commit = (finalValue: string) => {
        // Restore the pre-preview value silently, then apply the final value
        // as one regular (undoable) command.
        cell.prop(field.path, originalRef.current, { skipHistory: true });
        cell.prop(field.path, finalValue);
        originalRef.current = finalValue;
        syncedRef.current = true;
    };

    // Flush an unfinished preview when the field unmounts (selection change,
    // tab switch) so the pending value is committed as an undoable change.
    useEffect(() => {
        return () => {
            if (!syncedRef.current) {
                commit(readValue(cell, field));
            }
        };
    }, [cell, field.path]);

    const onInput = (evt: FormEvent<HTMLInputElement>) => {
        const newValue = (evt.target as HTMLInputElement).value;
        setValue(newValue);
        // Live preview — not recorded on the undo stack.
        cell.prop(field.path, newValue, { skipHistory: true });
        syncedRef.current = false;
    };

    // The commit must run on the native `change` event (fired once when the
    // color picker closes). React's synthetic `onChange` fires on every
    // `input` event, which would record an undo entry per preview tick.
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;
        const onNativeChange = () => commit(input.value);
        input.addEventListener('change', onNativeChange);
        return () => input.removeEventListener('change', onNativeChange);
    }, [cell, field.path]);

    return (
        <div className="field color-field">
            <input ref={inputRef} type="color" value={value} onChange={onInput} />
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
