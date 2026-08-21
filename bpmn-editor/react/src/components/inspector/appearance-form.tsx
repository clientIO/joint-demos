import { useEffect, useRef, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { useCellVersion } from './use-cell-version';

import type { FormEvent } from 'react';
import type { AppElement, AppLink } from '../../shapes/shapes-typing';

type SelectOption = string | number | { value: string | number; content: string };

interface FieldSpec {
    type: 'color' | 'select-box' | 'object';
    label?: string;
    group?: string;
    index?: number;
    options?: SelectOption[];
    defaultValue?: unknown;
    when?: { ne?: Record<string, unknown> };
    properties?: Record<string, unknown>;
}

interface FieldLeaf {
    path: string;
    spec: FieldSpec;
}

type Cell = AppElement | AppLink;

function isFieldSpec(value: unknown): value is FieldSpec {
    return !!value && typeof value === 'object'
        && typeof (value as FieldSpec).type === 'string'
        && ['color', 'select-box', 'object'].includes((value as FieldSpec).type);
}

// Evaluate a `when` condition of the shape `{ ne: { 'labels/0': null } }` —
// the field is shown only when every referenced property differs from the
// given value.
function evaluateWhen(cell: Cell, when: FieldSpec['when']): boolean {
    if (!when?.ne) return true;
    return Object.entries(when.ne).every(([path, value]) => (cell.prop(path) ?? null) !== value);
}

// Flatten the nested appearance-config `inputs` tree into leaves with
// slash-joined attribute paths (`attrs/label/fill`, `labels/0/attrs/body/fill`).
function collectLeaves(cell: Cell, node: Record<string, unknown>, basePath: string[]): FieldLeaf[] {
    const leaves: FieldLeaf[] = [];

    for (const [key, value] of Object.entries(node)) {
        const path = [...basePath, key];

        if (isFieldSpec(value)) {
            if (value.type === 'object') {
                if (value.properties && evaluateWhen(cell, value.when)) {
                    leaves.push(...collectLeaves(cell, value.properties, path));
                }
            } else {
                leaves.push({ path: path.join('/'), spec: value });
            }
        } else if (value && typeof value === 'object') {
            leaves.push(...collectLeaves(cell, value as Record<string, unknown>, path));
        }
    }

    return leaves;
}

function readValue(cell: Cell, leaf: FieldLeaf): string {
    const value = cell.prop(leaf.path) ?? leaf.spec.defaultValue ?? '';
    return String(value);
}

function ColorField({ cell, leaf, version }: { cell: Cell; leaf: FieldLeaf; version: number }) {
    const [value, setValue] = useState(() => readValue(cell, leaf));
    const inputRef = useRef<HTMLInputElement | null>(null);
    // The value at the start of the current preview interaction — the commit
    // rewrites original -> final as a single undoable command.
    const originalRef = useRef(value);
    const syncedRef = useRef(true);

    // Sync from the model on external changes (undo/redo, shape morph).
    useEffect(() => {
        const modelValue = readValue(cell, leaf);
        setValue(modelValue);
        if (syncedRef.current) {
            originalRef.current = modelValue;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cell, leaf.path, version]);

    const commit = (finalValue: string) => {
        // Restore the pre-preview value silently, then apply the final value
        // as one regular (undoable) command.
        cell.prop(leaf.path, originalRef.current, { skipHistory: true });
        cell.prop(leaf.path, finalValue);
        originalRef.current = finalValue;
        syncedRef.current = true;
    };

    // Flush an unfinished preview when the field unmounts (selection change,
    // tab switch) so the pending value is committed as an undoable change.
    useEffect(() => {
        return () => {
            if (!syncedRef.current) {
                commit(readValue(cell, leaf));
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cell, leaf.path]);

    const onInput = (evt: FormEvent<HTMLInputElement>) => {
        const newValue = (evt.target as HTMLInputElement).value;
        setValue(newValue);
        // Live preview — not recorded on the undo stack.
        cell.prop(leaf.path, newValue, { skipHistory: true });
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cell, leaf.path]);

    return (
        <div className="field color-field">
            <input ref={inputRef} type="color" value={value} onChange={onInput} />
            {leaf.spec.label && <label>{leaf.spec.label}</label>}
        </div>
    );
}

function optionValue(option: SelectOption): string {
    return String(typeof option === 'object' ? option.value : option);
}

function optionLabel(option: SelectOption): string {
    if (typeof option !== 'object') return String(option);
    // Option content is an HTML snippet in the shared config; use its text.
    return option.content.replace(/<[^>]*>/g, '') || String(option.value);
}

function SelectBoxField({ cell, leaf, version }: { cell: Cell; leaf: FieldLeaf; version: number }) {
    const [value, setValue] = useState(() => readValue(cell, leaf));

    useEffect(() => {
        setValue(readValue(cell, leaf));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cell, leaf.path, version]);

    const onValueChange = (selected: string) => {
        const option = leaf.spec.options?.find((opt) => optionValue(opt) === selected);
        // Preserve the original option type (e.g. numeric font sizes).
        const newValue = option !== undefined && typeof option !== 'object' ? option : selected;
        setValue(selected);
        cell.prop(leaf.path, newValue);
    };

    return (
        <div className="field select-box-field">
            {leaf.spec.label && <label>{leaf.spec.label}</label>}
            <Select.Root value={value} onValueChange={onValueChange}>
                <Select.Trigger className="select-box-trigger">
                    <Select.Value />
                    <Select.Icon asChild>
                        <ChevronDown size={14} />
                    </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content className="select-box-content" position="popper" sideOffset={4}>
                        <Select.Viewport>
                            {leaf.spec.options?.map((option) => (
                                <Select.Item
                                    key={optionValue(option)}
                                    value={optionValue(option)}
                                    className="select-box-item"
                                >
                                    <Select.ItemText>{optionLabel(option)}</Select.ItemText>
                                    <Select.ItemIndicator asChild>
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

export function AppearanceForm({ cell }: { cell: Cell }) {
    const version = useCellVersion(cell);

    const { groups, inputs } = cell.getAppearanceConfig();
    const leaves = collectLeaves(cell, inputs, []);

    // Order groups by their configured index; groups referenced by fields but
    // missing from the config render last without special ordering.
    const groupNames = [...new Set(leaves.map((leaf) => leaf.spec.group ?? ''))];
    groupNames.sort((a, b) => (groups[a]?.index ?? 99) - (groups[b]?.index ?? 99));

    return (
        <div className="joint-inspector">
            {groupNames.map((groupName) => {
                const groupLeaves = leaves
                    .filter((leaf) => (leaf.spec.group ?? '') === groupName)
                    .sort((a, b) => (a.spec.index ?? 0) - (b.spec.index ?? 0));

                return (
                    <div key={groupName} className="group" data-name={groupName}>
                        {groups[groupName]?.label && (
                            <h3 className="group-label">{groups[groupName].label}</h3>
                        )}
                        {groupLeaves.map((leaf) => (
                            leaf.spec.type === 'color'
                                ? <ColorField key={leaf.path} cell={cell} leaf={leaf} version={version} />
                                : <SelectBoxField key={leaf.path} cell={cell} leaf={leaf} version={version} />
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
