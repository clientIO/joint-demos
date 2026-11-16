import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
    FilePlus2,
    FolderOpen,
    Image,
    Maximize,
    Minus,
    Monitor,
    Moon,
    MoreHorizontal,
    Pencil,
    Play,
    Plus,
    Redo2,
    Save,
    Sun,
    Undo2,
    BookOpen,
} from 'lucide-react';
import {
    useGraph,
    useGraphHistory,
    useGraphHistoryStack,
    useImageExport,
    usePaperScroller,
    usePaperScrollerViewport,
} from '@joint/react-plus';
import { EXAMPLES } from '../examples';
import { MAX_FILE_BYTES, plantFromJSON } from '../plant/open-file';
import { MODIFIER_KEY, SHIFT_KEY } from '../ui/keys';
import { useMediaQuery } from '../ui/use-media-query';
import { DARK_QUERY, type ThemeChoice } from '../ui/use-theme';
import { FIT_OPTIONS, PAPER_ID, selectZoom, ZOOM_STEP } from './paper-id';

const NARROW_QUERY = '(max-width: 63.99rem)';
// The canvas tokens of `index.css` (`--color-canvas`), as concrete colors: the
// exported image is drawn outside the page, where CSS variables don't resolve.
const CANVAS_LIGHT = 'oklch(97.4% 0.006 252)';
const CANVAS_DARK = 'oklch(18% 0.022 262)';
const THEMES: ReadonlyArray<{ readonly value: ThemeChoice; readonly label: string; readonly Icon: typeof Sun }> = [
    { value: 'system', label: 'System theme', Icon: Monitor },
    { value: 'light', label: 'Light theme', Icon: Sun },
    { value: 'dark', label: 'Dark theme', Icon: Moon },
];

function Group({ children, className = '' }: { readonly children: ReactNode; readonly className?: string }) {
    return <div className={`flex items-center gap-2 ${className}`}>{children}</div>;
}

function download(url: string, fileName: string) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
}

interface ToolbarProps {
    readonly isRunning: boolean;
    readonly onRunningChange: (isRunning: boolean) => void;
    readonly onDiagramOpened: () => void;
    readonly theme: ThemeChoice;
    readonly onThemeChange: (theme: ThemeChoice) => void;
    readonly onError: (message: string) => void;
}

/** History, zoom (in the narrow layout), file and export actions. */
function EditActions({ isRunning, theme, onDiagramOpened, onError, hasZoom }: Pick<ToolbarProps, 'isRunning' | 'theme' | 'onDiagramOpened' | 'onError'> & { readonly hasZoom: boolean }) {
    const isSystemDark = useMediaQuery(DARK_QUERY);
    const isCanvasDark = theme === 'dark' || (theme === 'system' && isSystemDark);
    const { undo, redo, resetHistory } = useGraphHistory();
    const { canUndo, canRedo } = useGraphHistoryStack();
    const { resetCells, exportToJSON } = useGraph();
    const { setZoom, zoomToFit } = usePaperScroller(PAPER_ID);
    const zoom = usePaperScrollerViewport(PAPER_ID, selectZoom);
    const [exportImage, exportState] = useImageExport(PAPER_ID, { type: 'image/png', padding: 24, backgroundColor: isCanvasDark ? CANVAS_DARK : CANVAS_LIGHT });
    const fileInput = useRef<HTMLInputElement>(null);

    const replaceDiagram = (open: () => void) => {
        open();
        resetHistory();
        onDiagramOpened();
    };

    // The file is rebuilt cell by cell (`open-file.ts`), never loaded as it is.
    const openFile = async(file: File) => {
        if (file.size > MAX_FILE_BYTES) {
            onError(`${file.name} is too large to open.`);
            return;
        }
        try {
            const result = plantFromJSON(JSON.parse(await file.text()));
            if ('error' in result) {
                onError(`${file.name} ${result.error}`);
                return;
            }
            replaceDiagram(() => resetCells(result.cells));
        } catch {
            onError(`${file.name} could not be read as JSON.`);
        }
    };

    const save = () => {
        const blob = new Blob([JSON.stringify(exportToJSON(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        download(url, 'plant.json');
        // Revoked a moment later: some browsers cancel a download whose URL is revoked at once.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <>
            {!isRunning && (
                <Group>
                    <button type="button" className="key" onClick={undo} disabled={!canUndo} aria-label="Undo" title={`Undo (${MODIFIER_KEY}Z)`}><Undo2 className="size-4" aria-hidden /></button>
                    <button type="button" className="key" onClick={redo} disabled={!canRedo} aria-label="Redo" title={`Redo (${MODIFIER_KEY}${SHIFT_KEY}Z)`}><Redo2 className="size-4" aria-hidden /></button>
                </Group>
            )}
            {hasZoom && <Group>
                <button type="button" className="key" onClick={() => setZoom((previous) => previous / ZOOM_STEP)} aria-label="Zoom out"><Minus className="size-4" aria-hidden /></button>
                <span className="w-11 text-center font-mono text-xs text-ink-2 tabular-nums">{zoom}%</span>
                <button type="button" className="key" onClick={() => setZoom((previous) => previous * ZOOM_STEP)} aria-label="Zoom in"><Plus className="size-4" aria-hidden /></button>
                <button type="button" className="key" onClick={() => zoomToFit(FIT_OPTIONS)} aria-label="Fit the diagram" title="Fit the diagram"><Maximize className="size-4" aria-hidden /></button>
            </Group>}
            {!isRunning && (
                <Group>
                    <button type="button" className="key" onClick={() => replaceDiagram(() => resetCells([]))} title="New diagram"><FilePlus2 className="size-4" aria-hidden /><span className="lg:inline max-lg:sr-only">New</span></button>
                    <button type="button" className="key" popoverTarget="examples-menu" title="Open an example"><BookOpen className="size-4" aria-hidden /><span className="lg:inline max-lg:sr-only">Examples</span></button>
                    <div id="examples-menu" popover="auto" aria-label="Examples" className="menu-enter fixed inset-auto top-16 right-3 m-0 w-80 origin-top-right rounded-lg border border-rule bg-paper-2 p-1.5 text-ink shadow-[var(--shadow-panel)]">
                        {EXAMPLES.map((example) => (
                            <button
                                key={example.id}
                                type="button"
                                popoverTarget="examples-menu"
                                popoverTargetAction="hide"
                                onClick={() => replaceDiagram(() => resetCells(example.cells))}
                                className="grid w-full gap-0.5 rounded-md px-3 py-2 text-left transition-colors duration-[var(--dur-micro)] hover:bg-paper-3 focus-visible:bg-paper-3 focus-visible:outline-none"
                            >
                                <span className="font-display text-sm font-medium">{example.name}</span>
                                <span className="text-xs text-muted">{example.description}</span>
                            </button>
                        ))}
                    </div>
                    <button type="button" className="key" onClick={() => fileInput.current?.click()} title="Open a saved diagram"><FolderOpen className="size-4" aria-hidden /><span className="lg:inline max-lg:sr-only">Open</span></button>
                    <button type="button" className="key" onClick={save} title="Save as JSON"><Save className="size-4" aria-hidden /><span className="lg:inline max-lg:sr-only">Save</span></button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (file) {
                                void openFile(file);
                            }
                        }}
                    />
                </Group>
            )}
            <button
                type="button"
                className="key"
                disabled={exportState.isLoading}
                onClick={() => {
                    exportImage({ downloadAs: 'plant.png' }).catch(() => onError('The image could not be exported.'));
                }}
                title="Export as PNG"
            >
                <Image className="size-4" aria-hidden /><span className="lg:inline max-lg:sr-only">{exportState.isLoading ? 'Exporting…' : 'Image'}</span>
            </button>
        </>
    );
}

function ThemeSwitch({ theme, onThemeChange }: Pick<ToolbarProps, 'theme' | 'onThemeChange'>) {
    return (
        <div role="group" aria-label="Theme" className="flex gap-1 rounded-md bg-paper-3 p-0.5">
            {THEMES.map(({ value, label, Icon }) => (
                <button
                    key={value}
                    type="button"
                    aria-label={label}
                    aria-pressed={theme === value}
                    title={label}
                    onClick={() => onThemeChange(value)}
                    className="grid size-8 place-items-center rounded-[5px] text-muted transition-colors duration-[var(--dur-micro)] hover:text-ink aria-pressed:bg-key-face aria-pressed:text-ink aria-pressed:shadow-[var(--shadow-key)]"
                >
                    <Icon className="size-4" aria-hidden />
                </button>
            ))}
        </div>
    );
}

const formatElapsed = (seconds: number): string =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/** Mounted while the plant runs: how long it has run, and a signal that it is live. */
function RunStatus() {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setSeconds((previous) => previous + 1), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <p className="flex items-center gap-2 rounded-md border border-rule px-3 py-1.5 text-sm text-ink-2 max-sm:hidden">
            <svg viewBox="0 0 16 16" className="size-4 text-success" aria-hidden>
                <circle className="live-signal" cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="3" fill="currentColor" />
            </svg>
            {/* Announced once; the clock is left out, or a screen reader would read every second. */}
            <span role="status">Running</span>
            <span className="font-mono text-xs tabular-nums text-muted" aria-hidden>{formatElapsed(seconds)}</span>
        </p>
    );
}

/** The top bar: the mode switch, the run status, and the edit, file and theme actions. */
export function Toolbar(props: ToolbarProps) {
    const { isRunning, onRunningChange } = props;
    const isNarrow = useMediaQuery(NARROW_QUERY);
    return (
        <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-rule bg-paper-2 px-3 sm:px-4">
            <h1 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink">
                <svg viewBox="0 0 24 24" className="size-6 text-accent" aria-hidden>
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 12 L12 5 M12 12 L18 15 M12 12 L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="max-sm:sr-only">SCADA Editor</span>
            </h1>

            <div role="group" aria-label="Mode" data-mode={isRunning ? 'run' : 'edit'} className="mode-switch relative grid grid-cols-2 rounded-md bg-paper-3 p-0.5">
                <span aria-hidden className="mode-thumb absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-[5px] border" />
                <button type="button" aria-pressed={!isRunning} onClick={() => onRunningChange(false)} className="relative flex min-h-8 items-center justify-center gap-2 rounded-[5px] px-3 font-display text-sm font-medium text-muted transition-colors duration-[var(--dur-short)] hover:text-ink aria-pressed:text-ink">
                    <Pencil className="size-4" aria-hidden /> Edit
                </button>
                <button type="button" aria-pressed={isRunning} onClick={() => onRunningChange(true)} className="relative flex min-h-8 items-center justify-center gap-2 rounded-[5px] px-3 font-display text-sm font-medium text-muted transition-colors duration-[var(--dur-short)] hover:text-ink aria-pressed:text-accent-ink">
                    <Play className="size-4" aria-hidden /> Run
                </button>
            </div>
            {isRunning && <RunStatus />}

            {isNarrow ? (
                <div className="ml-auto">
                    <button type="button" className="key" popoverTarget="toolbar-more" aria-label="More actions"><MoreHorizontal className="size-4" aria-hidden /></button>
                    <div
                        id="toolbar-more"
                        popover="auto"
                        className="menu-enter inset-auto top-16 right-3 m-0 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-lg border border-rule bg-paper-2 p-3 text-ink shadow-[var(--shadow-panel)]"
                    >
                        <div className="flex flex-wrap items-center gap-3">
                            <EditActions {...props} hasZoom />
                            <ThemeSwitch {...props} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="ml-auto flex items-center gap-3">
                    <EditActions {...props} hasZoom={false} />
                    <ThemeSwitch {...props} />
                </div>
            )}
        </header>
    );
}
