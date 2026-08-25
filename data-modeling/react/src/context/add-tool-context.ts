// The "add" request bridge: clicking a toolbar tool (table / group / note) or
// pressing its T / G / N shortcut sets `armed` to that tool; useCanvasTools (which
// has the paper) sees it, drops one cell of that kind at a clear spot in the visible
// viewport, focuses it, and clears the flag. Context + hook live here (no component)
// so the provider stays a clean fast-refresh boundary.

import { createContext, useContext } from 'react';

export type AddTool = 'table' | 'group' | 'note';

export interface AddToolApi {
  readonly armed: AddTool | null;
  readonly arm: (tool: AddTool) => void;
  readonly disarm: () => void;
}

export const AddToolContext = createContext<AddToolApi | null>(null);

export function useAddTool(): AddToolApi {
    const value = useContext(AddToolContext);
    if (value === null) throw new Error('useAddTool must be used within <AddToolProvider>');
    return value;
}
