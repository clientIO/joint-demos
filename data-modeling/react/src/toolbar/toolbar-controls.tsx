// Shared toolbar config and the two larger sub-controls: the segmented dialect
// switcher and the narrow-width overflow menu. Split out of toolbar.tsx to keep
// each file focused and under the module size limit.

import {
    Check,
    ChevronDown,
    Code2,
    Download,
    Eraser,
    ImageDown,
    MoreHorizontal,
    Moon,
    Redo2,
    Sun,
    Undo2,
    Upload,
} from 'lucide-react';
import { TOOLS, ACTIVE } from './toolbar-tools';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AddTool } from '@/context/add-tool-context';
import { DIALECTS, DIALECT_VALUES } from '@/context/dialect-context';
import type { Dialect } from '@/schema/types';
import { rovingRadioKeyDown } from '@/utils/roving-radio';
import { cn } from '@/utils/cn';

// Segmented dialect picker. SQLite / Postgres execute in-browser; MySQL is
// generate-only, flagged with a small caption when selected.
export function DialectSwitcher({
    dialect,
    onChange,
}: {
  readonly dialect: Dialect;
  readonly onChange: (dialect: Dialect) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <div
                role="radiogroup"
                aria-label="SQL dialect"
                onKeyDown={(event) => rovingRadioKeyDown(event, DIALECT_VALUES, dialect, onChange)}
                className="inline-flex rounded-md bg-muted p-0.5"
            >
                {DIALECTS.map((option) => (
                    <Button
                        key={option.value}
                        type="button"
                        role="radio"
                        data-value={option.value}
                        aria-checked={option.value === dialect}
                        tabIndex={option.value === dialect ? 0 : -1}
                        variant="ghost"
                        size="sm"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'h-7 rounded-sm px-2.5 text-xs font-medium',
                            option.value === dialect
                                ? 'bg-background text-foreground shadow-sm hover:bg-background'
                                : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
                        )}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
            {dialect === 'mysql' ? (
                <span className="hidden text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:inline">
          generate-only
                </span>
            ) : null}
        </div>
    );
}

// Narrow-width fallback for the tools + undo/redo groups.
export function OverflowMenu({
    armed,
    onArm,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
}: {
  readonly armed: AddTool | null;
  readonly onArm: (tool: AddTool) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More tools">
                    <MoreHorizontal className="size-4" />
                    <ChevronDown className="size-3 opacity-60" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Add</DropdownMenuLabel>
                {TOOLS.map((spec) => (
                    <DropdownMenuItem
                        key={spec.tool}
                        onSelect={() => onArm(spec.tool)}
                        className={cn(armed === spec.tool && ACTIVE)}
                    >
                        <spec.icon className="size-4" />
                        {spec.label}
                        <kbd className="ml-auto rounded border border-border bg-muted px-1 text-[10px] text-muted-foreground">
                            {spec.shortcut}
                        </kbd>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={!canUndo} onSelect={onUndo}>
                    <Undo2 className="size-4" />
          Undo
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!canRedo} onSelect={onRedo}>
                    <Redo2 className="size-4" />
          Redo
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Mobile fallback for the RIGHT toolbar cluster: the dialect switcher + import/export/clear
// + SQL panel + theme fold in here so a phone toolbar keeps only the search, the create-tools
// overflow, and the primary "Run query" CTA on the bar. Everything stays reachable, nothing
// runs off the edge. Clear routes back up to the shared confirm dialog via `onRequestClear`.
export function MoreMenu({
    dialect,
    onDialect,
    sqlPanelOpen,
    onToggleSqlPanel,
    onOpenImport,
    onExport,
    onExportPng,
    onRequestClear,
    isDark,
    onToggleTheme,
}: {
  readonly dialect: Dialect;
  readonly onDialect: (dialect: Dialect) => void;
  readonly sqlPanelOpen: boolean;
  readonly onToggleSqlPanel: () => void;
  readonly onOpenImport: () => void;
  readonly onExport: () => void;
  readonly onExportPng: () => void;
  readonly onRequestClear: () => void;
  readonly isDark: boolean;
  readonly onToggleTheme: () => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions">
                    <MoreHorizontal className="size-4" />
                    <ChevronDown className="size-3 opacity-60" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Dialect</DropdownMenuLabel>
                {DIALECTS.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onSelect={() => onDialect(option.value)}
                        aria-checked={option.value === dialect}
                        role="menuitemradio"
                    >
                        <Check className={cn('size-4', option.value === dialect ? 'opacity-100' : 'opacity-0')} />
                        {option.label}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onToggleSqlPanel} aria-pressed={sqlPanelOpen}>
                    <Code2 className="size-4" />
                    {sqlPanelOpen ? 'Hide SQL panel' : 'SQL panel'}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onOpenImport}>
                    <Upload className="size-4" />
          Import SQL
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onExport}>
                    <Download className="size-4" />
          Export SQL
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onExportPng}>
                    <ImageDown className="size-4" />
          Export PNG
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onRequestClear}>
                    <Eraser className="size-4" />
          Clear canvas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onToggleTheme}>
                    {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    {isDark ? 'Light mode' : 'Dark mode'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
