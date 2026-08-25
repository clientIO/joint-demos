// Keyboard FK creation. Drawing a relationship is otherwise pointer-only (drag a
// wire between two column magnets), so a keyboard user can't create the FKs the
// acceptance doc requires. This context lets a focused column start a "link draft"
// (press L) and a second focused column complete it (press L again) — the provider
// owns the pending source + the actual link creation.
import { createContext, useContext } from 'react';

export interface ColumnRef {
  readonly tableId: string;
  readonly columnId: string;
}

export interface LinkDraftApi {
  // The column a link is currently being drawn FROM, or null when idle.
  readonly pending: ColumnRef | null;
  // Toggle this column as the draft source, complete a pending draft to it, or
  // cancel when it's the same column already pending.
  readonly toggle: (column: ColumnRef) => void;
}

export const LinkDraftContext = createContext<LinkDraftApi>({ pending: null, toggle: () => {} });

export function useLinkDraft(): LinkDraftApi {
    return useContext(LinkDraftContext);
}
