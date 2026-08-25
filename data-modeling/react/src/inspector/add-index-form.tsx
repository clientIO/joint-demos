// The "add index" form for the table inspector: pick columns (order follows the
// table, not click order, for deterministic SQL), toggle UNIQUE, name it (or accept
// the suggested name), and submit. Local draft state only — commits via `onAdd`.

import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { newId } from '@/schema/id';
import type { Index, Table } from '@/schema/types';

function suggestName(table: Table, columnIds: readonly string[], unique: boolean): string {
    const first = table.columns.find((column) => column.id === columnIds[0])?.name ?? 'idx';
    return `${unique ? 'uq' : 'idx'}_${table.name}_${first}`;
}

interface AddIndexFormProps {
  readonly table: Table;
  readonly onAdd: (index: Index) => void;
}

export function AddIndexForm({ table, onAdd }: AddIndexFormProps) {
    const [name, setName] = useState('');
    const [unique, setUnique] = useState(false);
    const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());

    // Preserve table column order (not click order) for deterministic index SQL.
    const columnIds = table.columns.filter((column) => checked.has(column.id)).map((column) => column.id);
    const canAdd = columnIds.length > 0;

    const toggle = (columnId: string) =>
        setChecked((previous) => {
            const next = new Set(previous);
            if (next.has(columnId)) next.delete(columnId);
            else next.add(columnId);
            return next;
        });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!canAdd) return;
        onAdd({
            id: newId('idx'),
            name: name.trim() || suggestName(table, columnIds, unique),
            columnIds,
            unique,
        });
        setName('');
        setUnique(false);
        setChecked(new Set());
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-2 rounded-md border border-dashed border-border p-2.5">
            <span className="text-[11px] font-medium text-muted-foreground">Add index</span>

            <fieldset className="flex flex-col gap-1">
                <legend className="sr-only">Columns</legend>
                {table.columns.map((column) => (
                    <label
                        key={column.id}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 font-mono text-xs text-card-foreground hover:bg-accent"
                    >
                        <input
                            type="checkbox"
                            checked={checked.has(column.id)}
                            onChange={() => toggle(column.id)}
                            className="size-3.5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <span className="truncate">{column.name}</span>
                    </label>
                ))}
            </fieldset>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                    type="checkbox"
                    checked={unique}
                    onChange={(event) => setUnique(event.target.checked)}
                    className="size-3.5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
        Unique
            </label>

            <Input
                aria-label="Index name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={canAdd ? suggestName(table, columnIds, unique) : 'index name'}
                className="h-8 font-mono text-xs"
            />

            <Button type="submit" size="sm" disabled={!canAdd} className="gap-1.5">
                <Plus className="size-3.5" />
        Add index
            </Button>
        </form>
    );
}
