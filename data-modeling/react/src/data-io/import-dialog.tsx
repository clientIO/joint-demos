// Import SQL modal: paste or upload DDL, pick a dialect, run importSql, and hand
// the parsed Schema back to the app. Reuses the ui Dialog / Tabs / Button
// primitives; the SQL field is a plain <textarea> on purpose — pulling in the
// real sql-editor here would couple this dialog to the canvas editor stack.
import { useId, useRef, useState, type DragEvent } from 'react';
import { AlertCircle, ClipboardType, Database, FileCode2, Upload, type LucideIcon } from 'lucide-react';
import { useGraph, usePaperScroller } from '@joint/react-plus';

import { transitionToContent } from '@/canvas/fit-content';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DIALECTS, DIALECT_VALUES } from '@/context/dialect-context';
import { detectDialect } from '@/schema/detect-dialect';
import type { Dialect, Schema } from '@/schema/types';
import { rovingRadioKeyDown } from '@/utils/roving-radio';
import { cn } from '@/utils/cn';
import { EXAMPLES } from './examples';

interface ImportDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  // `dataSql` = the file's INSERT statements (may be empty) — seeds the query runner.
  readonly onImport: (schema: Schema, dataSql: string) => void;
}

// SQL input source. A segmented radiogroup (not ARIA tabs): the paste/upload panes
// are rendered separately below, so real tabpanels would be empty — a single-choice
// control is the honest semantics and matches the adjacent dialect picker.
const SOURCES: readonly { readonly value: string; readonly label: string; readonly Icon: LucideIcon }[] = [
    { value: 'paste', label: 'Paste', Icon: ClipboardType },
    { value: 'upload', label: 'Upload', Icon: Upload },
];

const SOURCE_VALUES: readonly string[] = SOURCES.map((source) => source.value);

export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
    // For the post-import fit — this dialog renders inside <Diagram>, so the
    // paper-scroller context resolves here (Workspace, which owns the cells, is above it).
    const scroller = usePaperScroller();
    const { graph } = useGraph();
    const [dialect, setDialect] = useState<Dialect>('sqlite');
    const [sql, setSql] = useState('');
    const [errors, setErrors] = useState<readonly string[]>([]);
    const [tab, setTab] = useState('paste');
    const [dragging, setDragging] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    // Once the user picks a dialect by hand, stop auto-detecting so we don't override them.
    const dialectPicked = useRef(false);
    const errorsId = useId();

    // Every dismissal path (X, Esc, overlay, Cancel, success) routes here so state
    // never leaks into the next open. The dialect resets to auto-detect for the next import.
    function close(): void {
        setSql('');
        setErrors([]);
        setDragging(false);
        dialectPicked.current = false;
        onClose();
    }

    function edit(next: string): void {
        setSql(next);
        if (errors.length > 0) setErrors([]);
        // Auto-pick the parser from the SQL itself (a pg_dump under the default sqlite parser
        // silently loses most tables + all FKs). Skipped once the user has chosen by hand.
        if (!dialectPicked.current && next.trim().length > 0) setDialect(detectDialect(next));
    }

    async function readFile(file: File): Promise<void> {
        const text = await file.text();
        edit(text);
        setTab('paste');
    }

    function onDrop(event: DragEvent<HTMLButtonElement>): void {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void readFile(file);
    }

    // node-sql-parser is heavy (~150KB) and only needed on an actual import, so it's
    // pulled in via a dynamic import here instead of at module load.
    async function handleImport(): Promise<void> {
        const { importSql } = await import('@/schema/import-sql');
        const result = importSql(sql, dialect);
        // Block ONLY when nothing was salvaged. Warnings with tables parsed (a few skipped
        // statements in a big dump) must not wall off the import — salvage is the contract.
        if (result.schema.tables.length === 0) {
            setErrors(
                result.errors.length > 0
                    ? result.errors
                    : ['No CREATE TABLE statements found. Paste some SQL DDL to import.'],
            );
            return;
        }
        onImport(result.schema, result.dataSql);
        close();
        // Frame the freshly imported diagram with the same animated fit as the minimap
        // button. A short settle delay, not rAF: joint lays the new views out async, so a
        // rAF-timed fit still sees a partial bbox on a big import (Chinook = 11 tables).
        window.setTimeout(() => transitionToContent(scroller, graph), 150);
    }

    const canImport = sql.trim().length > 0;

    const pasteHint = (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Try an example:</span>
            {EXAMPLES.map((example) => (
                <Button
                    key={example.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        edit(example.ddl);
                        setTab('paste');
                    }}
                >
                    <FileCode2 />
                    {example.label}
                </Button>
            ))}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
            <DialogContent className="max-w-2xl gap-5">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
                            <Database className="size-4" />
                        </span>
            Import SQL
                    </DialogTitle>
                    <DialogDescription>
            Paste or upload a schema as SQL DDL. We parse the CREATE TABLE statements and lay the tables out for you.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <SourcePicker value={tab} onChange={setTab} />
                    <DialectPicker
                        value={dialect}
                        onChange={(next) => {
                            dialectPicked.current = true;
                            setDialect(next);
                        }}
                    />
                </div>

                {tab === 'paste' ? (
                    <div className="space-y-3">
                        <textarea
                            value={sql}
                            onChange={(event) => edit(event.target.value)}
                            spellCheck={false}
                            aria-label="SQL DDL"
                            aria-invalid={errors.length > 0}
                            aria-describedby={errors.length > 0 ? errorsId : undefined}
                            placeholder="CREATE TABLE users (&#10;  id INTEGER PRIMARY KEY,&#10;  email VARCHAR(255) NOT NULL UNIQUE&#10;);"
                            className={cn(
                                'h-64 w-full resize-none rounded-md border border-input bg-background px-3 py-2.5',
                                'font-mono text-xs leading-relaxed text-foreground shadow-sm transition-colors',
                                'placeholder:text-muted-foreground',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            )}
                        />
                        {pasteHint}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        onDragOver={(event) => {
                            event.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        className={cn(
                            'flex h-64 w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed text-center transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            dragging ? 'border-primary bg-primary/5' : 'border-input bg-background hover:bg-accent/50',
                        )}
                    >
                        <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                            <Upload className="size-5" />
                        </span>
                        <span className="text-sm font-medium">Drop a .sql file here, or click to browse</span>
                        <span className="text-xs text-muted-foreground">The file contents load into the editor for review before import.</span>
                    </button>
                )}

                <input
                    ref={fileInput}
                    type="file"
                    accept=".sql,text/plain"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void readFile(file);
                        event.target.value = '';
                    }}
                />

                {errors.length > 0 ? (
                    <div
                        id={errorsId}
                        role="alert"
                        className="space-y-1.5 rounded-md border border-destructive/40 bg-destructive/5 p-3"
                    >
                        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                            <AlertCircle className="size-4" /> Could not import this SQL
                        </p>
                        <ul className="space-y-1 pl-6 text-xs text-destructive">
                            {errors.map((message, index) => (
                                <li key={index} className="list-disc font-mono leading-relaxed">
                                    {message}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={close}>
            Cancel
                    </Button>
                    <Button type="button" onClick={() => void handleImport()} disabled={!canImport}>
                        <Database />
            Import schema
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Segmented paste/upload source selector — a radiogroup, keyboard-navigable with
// arrows via the shared roving handler (same pattern as DialectPicker below).
function SourcePicker({ value, onChange }: { readonly value: string; readonly onChange: (value: string) => void }) {
    return (
        <div
            role="radiogroup"
            aria-label="SQL source"
            onKeyDown={(event) => rovingRadioKeyDown(event, SOURCE_VALUES, value, onChange)}
            className="inline-flex rounded-md bg-muted p-0.5"
        >
            {SOURCES.map(({ value: option, label, Icon }) => (
                <Button
                    key={option}
                    type="button"
                    role="radio"
                    data-value={option}
                    aria-checked={option === value}
                    tabIndex={option === value ? 0 : -1}
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(option)}
                    className={cn(
                        'h-7 gap-1.5 rounded-sm text-xs font-medium',
                        option === value
                            ? 'bg-background text-foreground shadow-sm hover:bg-background'
                            : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
                    )}
                >
                    <Icon className="size-3.5" />
                    {label}
                </Button>
            ))}
        </div>
    );
}

// Segmented dialect selector built from ghost Buttons inside a muted track,
// matching the Tabs segmented look. role=radiogroup so it announces as a choice.
function DialectPicker({ value, onChange }: { readonly value: Dialect; readonly onChange: (dialect: Dialect) => void }) {
    return (
        <div
            role="radiogroup"
            aria-label="SQL dialect"
            onKeyDown={(event) => rovingRadioKeyDown(event, DIALECT_VALUES, value, onChange)}
            className="inline-flex rounded-md bg-muted p-0.5"
        >
            {DIALECTS.map((option) => (
                <Button
                    key={option.value}
                    type="button"
                    role="radio"
                    data-value={option.value}
                    aria-checked={option.value === value}
                    tabIndex={option.value === value ? 0 : -1}
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'h-7 rounded-sm text-xs font-medium',
                        option.value === value
                            ? 'bg-background text-foreground shadow-sm hover:bg-background'
                            : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
                    )}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );
}
