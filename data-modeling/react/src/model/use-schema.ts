// The controlled cells projected to the domain Schema, re-rendering the consumer
// ONLY when the schema STRUCTURE changes — never on the position-only store commits
// that fire every frame while a node is dragged.
//
// WHY the selector + isEqual form: `useCells()` yields a fresh array on every commit
// (a dragged cell's record identity changes each frame). Subscribing with a bare
// `useCells()` and deriving afterwards re-rendered every consumer ~60×/sec during a
// drag. `useCells(cellsToSchema, schemasEqual)` runs the projection inside the store
// selector and short-circuits with `schemasEqual` — the derived Schema carries NO
// positions, so a position-only drag yields a structurally identical schema, the
// consumer does not re-render, and its DDL/SQL memos never re-run.

import { useCells } from '@joint/react-plus';
import { cellsToSchema } from './schema-cells';
import type { Relation, Schema } from '../schema/types';

// Structural equality for the derived schema, run once per store commit (the isEqual
// of a useCells selector). It must be CHEAP: a JSON.stringify compare would serialize
// the whole schema twice on every drag frame and scale with imported-schema size.
// Instead we exploit reference stability — cellsToSchema returns the SAME table/group
// object refs across position-only commits (a real edit swaps the ref via updateTable's
// spread), so tables/groups compare by identity. Only relations are rebuilt fresh each
// commit (relationFromCell allocates), so they compare by their few scalar fields.
function refArrayEqual<T>(a: readonly T[], b: readonly T[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function relationsEqual(a: readonly Relation[], b: readonly Relation[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        const x = a[i];
        const y = b[i];
        if (x === undefined || y === undefined) return false;
        if (
            x.id !== y.id ||
      x.cardinality !== y.cardinality ||
      x.onDelete !== y.onDelete ||
      x.onUpdate !== y.onUpdate ||
      x.source.tableId !== y.source.tableId ||
      x.source.columnId !== y.source.columnId ||
      x.target.tableId !== y.target.tableId ||
      x.target.columnId !== y.target.columnId
        ) {
            return false;
        }
    }
    return true;
}

function schemasEqual(a: Schema, b: Schema): boolean {
    return (
        a === b ||
    (refArrayEqual(a.tables, b.tables) &&
      refArrayEqual(a.groups, b.groups) &&
      relationsEqual(a.relations, b.relations))
    );
}

export function useSchema(): Schema {
    return useCells(cellsToSchema, schemasEqual);
}
