// Pure helpers for a column's SQL type: build a ColumnType from a picked kind, and
// render a type (with its parameters) as a display string. Split from
// table-column-row so the row component stays under the file-size cap.

import type { CanonicalKind, ColumnType } from '@/schema/sql-types';

// Build a valid ColumnType from a canonical kind picked in the select. Every
// parameterised kind carries only optional params, so a bare `{ kind }` is valid
// for each variant — the switch narrows `kind` so no `as` cast is needed.
export function typeOfKind(kind: CanonicalKind): ColumnType {
    switch (kind) {
        case 'varchar':
        case 'char':
            return { kind };
        case 'numeric':
            return { kind };
        default:
            return { kind };
    }
}

// Display label for a column type, including any parameters.
export function typeLabel(type: ColumnType): string {
    if (type.kind === 'raw') return type.sql;
    if ((type.kind === 'varchar' || type.kind === 'char') && type.length !== undefined) {
        return `${type.kind}(${type.length})`;
    }
    if (type.kind === 'numeric' && type.precision !== undefined) {
        return type.scale === undefined
            ? `${type.kind}(${type.precision})`
            : `${type.kind}(${type.precision},${type.scale})`;
    }
    return type.kind;
}
