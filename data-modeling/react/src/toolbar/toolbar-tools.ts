// Shared toolbar config (no components) so both toolbar.tsx and toolbar-controls.tsx
// can import it without tripping the react-refresh "components-only file" rule.

import { Group, StickyNote, Table2, type LucideIcon } from 'lucide-react';
import type { AddTool } from '@/context/add-tool-context';

export interface ToolSpec {
  readonly tool: AddTool;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly shortcut: string;
}

// Add tools with their single-key shortcuts (also bound globally). Activating one
// (click or shortcut) drops a cell immediately — see useCanvasTools.
export const TOOLS: readonly ToolSpec[] = [
    { tool: 'table', label: 'Add table', icon: Table2, shortcut: 'T' },
    { tool: 'group', label: 'Add group', icon: Group, shortcut: 'G' },
    { tool: 'note', label: 'Add note', icon: StickyNote, shortcut: 'N' },
];

// Coral fill shared by every active/armed toolbar control.
export const ACTIVE = 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary';
