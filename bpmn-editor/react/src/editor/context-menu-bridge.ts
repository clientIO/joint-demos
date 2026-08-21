export interface ContextMenuItem {
    action: string;
    label: string;
}

// A context menu request in local (graph) coordinates.
export interface ContextMenuState {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onAction: (action: string) => void;
}

// The context-menu API the controllers rely on. Implemented by a bridge
// object that forwards to React state (see `app.tsx`), which drives the
// `<LinkContextMenu>` component.
export interface ContextMenuLike {
    open(state: ContextMenuState): void;
    close(): void;
}
