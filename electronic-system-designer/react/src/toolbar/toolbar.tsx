// The top bar: brand, the three view tabs (architecture / connectivity /
// outputs), the suggestions chip, the animation toggle, undo/redo, a
// confirmed clear (canvas tabs), theme, and a confirmed reset. Everything
// reads the zustand store; no state is duplicated here.

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Activity, CircleAlert, Eraser, Moon, RotateCcw, Redo2, Sun, TriangleAlert, Undo2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { useAnnouncer } from '@/components/ui/announcer-context';
import { useTheme } from '@/hooks/use-theme';
import { useDesignerStore, type ViewId } from '@/state/designer-store';

function Separator() {
    return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}

const VIEWS: readonly { readonly id: ViewId; readonly label: string }[] = [
    { id: 'architecture', label: 'Architecture' },
    { id: 'connectivity', label: 'Connectivity' },
    { id: 'outputs', label: 'Outputs' },
];

/** Proper tabs: tablist semantics with roving arrow-key focus. */
function ViewTabs() {
    const view = useDesignerStore((state) => state.view);
    const setView = useDesignerStore((state) => state.setView);
    const refs = useRef(new Map<ViewId, HTMLButtonElement>());

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const index = VIEWS.findIndex((candidate) => candidate.id === view);
        const nextIndex = (index + (event.key === 'ArrowRight' ? 1 : VIEWS.length - 1)) % VIEWS.length;
        const next = VIEWS[nextIndex];
        if (next === undefined) return;
        setView(next.id);
        refs.current.get(next.id)?.focus();
    };

    return (
        <div role="tablist" aria-label="Designer views" onKeyDown={onKeyDown} className="flex items-center gap-0.5">
            {VIEWS.map((candidate) => {
                const active = candidate.id === view;
                return (
                    <button
                        key={candidate.id}
                        ref={(node) => {
                            if (node) refs.current.set(candidate.id, node);
                            else refs.current.delete(candidate.id);
                        }}
                        role="tab"
                        id={`tab-${candidate.id}`}
                        aria-selected={active}
                        aria-controls={`panel-${candidate.id}`}
                        tabIndex={active ? 0 : -1}
                        // data-canvas-escape: where ESC from a focused canvas symbol lands.
                        // The current view's tab, because it is never disabled (Undo is,
                        // on a fresh design — a disabled target swallows the hop).
                        data-canvas-escape={active ? '' : undefined}
                        onClick={() => setView(candidate.id)}
                        className={`chamfer px-3 py-1.5 text-sm transition-colors [--chamfer:6px] ${
                            active
                                ? 'bg-primary font-semibold text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                    >
                        {candidate.label}
                    </button>
                );
            })}
        </div>
    );
}

/** Suggestion counts; clicking opens the design suggestions in Outputs. */
function ValidationChip() {
    const [errors, warnings] = useDesignerStore(
        useShallow((state) => {
            let errorCount = 0;
            for (const finding of state.findings) if (finding.severity === 'error') errorCount += 1;
            return [errorCount, state.findings.length - errorCount] as const;
        }),
    );
    const setView = useDesignerStore((state) => state.setView);
    const clean = errors === 0 && warnings === 0;
    // No aria-label: the accessible name is composed from the content itself
    // (visible numbers + sr-only words), so it always CONTAINS the visible text.
    return (
        <Tooltip label={clean ? 'No design suggestions' : 'Open the design suggestions'}>
            <button
                type="button"
                onClick={() => setView('outputs')}
                className="hidden items-center gap-1.5 border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent sm:flex"
            >
                {clean ? (
                    <>
                        <span aria-hidden className="size-2 rounded-full bg-status-success" />
                        <span>no suggestions</span>
                    </>
                ) : (
                    <>
                        <CircleAlert className="size-3.5 text-destructive" aria-hidden />
                        <span className="font-mono tabular-nums">{errors}</span>
                        <span className="sr-only">{errors === 1 ? 'suggestion to review,' : 'suggestions to review,'}</span>
                        <TriangleAlert className="size-3.5 text-status-warning" aria-hidden />
                        <span className="font-mono tabular-nums">{warnings}</span>
                        <span className="sr-only">
              to consider — open the design suggestions
                        </span>
                    </>
                )}
            </button>
        </Tooltip>
    );
}

/** A destructive toolbar action behind a confirmation dialog (reset, clear). */
function ConfirmActionDialog({
    tooltip,
    icon,
    title,
    description,
    confirmLabel,
    onConfirm,
}: {
  readonly tooltip: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Tooltip label={tooltip}>
                <Dialog.Trigger asChild>
                    <Button size="icon" aria-label={tooltip}>
                        {icon}
                    </Button>
                </Dialog.Trigger>
            </Tooltip>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
                <Dialog.Content className="chamfer-panel chamfer-frame [--frame-chamfer:var(--chamfer-panel)] fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 bg-popover p-4 shadow-(--panel-shadow)">
                    <Dialog.Title className="text-sm font-semibold">{title}</Dialog.Title>
                    <Dialog.Description className="mt-1.5 text-sm text-muted-foreground">
                        {description}
                    </Dialog.Description>
                    <div className="mt-4 flex justify-end gap-2">
                        <Dialog.Close asChild>
                            <Button variant="outline">Cancel</Button>
                        </Dialog.Close>
                        <Button
                            variant="primary"
                            onClick={() => {
                                onConfirm();
                                setOpen(false);
                            }}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export function Toolbar() {
    const undo = useDesignerStore((state) => state.undo);
    const redo = useDesignerStore((state) => state.redo);
    const canUndo = useDesignerStore((state) => state.past.length > 0);
    const canRedo = useDesignerStore((state) => state.future.length > 0);
    const liveMode = useDesignerStore((state) => state.liveMode);
    const toggleLiveMode = useDesignerStore((state) => state.toggleLiveMode);
    const onCanvasView = useDesignerStore((state) => state.view !== 'outputs');
    const reset = useDesignerStore((state) => state.reset);
    const clearDesign = useDesignerStore((state) => state.clearDesign);
    const { theme, toggle } = useTheme();
    const announce = useAnnouncer();

    return (
        <header className="z-20 flex h-12 flex-none items-center gap-2 overflow-x-auto border-b border-border bg-card px-3 [scrollbar-width:none]">
            {/* Brand — the favicon motif at toolbar scale. */}
            <div className="flex flex-none items-center gap-2.5 pr-1">
                <span className="chamfer grid size-6 flex-none place-items-center bg-primary [--chamfer:6px]">
                    <svg viewBox="0 0 32 32" className="size-4" aria-hidden>
                        <rect x="5" y="5" width="12" height="12" fill="none" stroke="white" strokeWidth="2.6" />
                        <path d="M17 11 H27 M22 11 V21 M22 21 H15 M11 17 V27" stroke="white" strokeWidth="2.6" fill="none" />
                        <circle cx="26.5" cy="21" r="2.4" fill="white" />
                        <circle cx="11" cy="27.5" r="2.4" fill="white" />
                    </svg>
                </span>
                <span className="text-sm font-semibold tracking-tight max-lg:hidden">System Designer</span>
                <span className="hidden text-xs text-muted-foreground xl:inline">Industrial Sensor Gateway</span>
            </div>

            <div className="mx-auto flex-none">
                <ViewTabs />
            </div>

            <div className="flex flex-none items-center gap-1">
                <ValidationChip />
                {/* Plainly an ANIMATION, not a simulation — the overlay shows how
            JointJS animates a diagram (voltages, signal flow), and the name
            must not suggest an electrical solver an engineer would expect. */}
                <Tooltip label={liveMode ? 'Hide the animation' : 'See the animation: operating values + signal flow'}>
                    <Button
                        variant={liveMode ? 'primary' : 'ghost'}
                        size="icon"
                        aria-label={liveMode ? 'Hide animation' : 'See animation'}
                        aria-pressed={liveMode}
                        onClick={() => {
                            toggleLiveMode();
                            announce(liveMode ? 'Animation hidden' : 'Animation on — overlaying operating values');
                        }}
                    >
                        <Activity className="size-4" aria-hidden />
                    </Button>
                </Tooltip>
                <Separator />
                <Tooltip label="Undo">
                    <Button
                        size="icon"
                        aria-label="Undo"
                        disabled={!canUndo}
                        onClick={() => {
                            undo();
                            // Undo is otherwise silent to a screen reader — the change
                            // happens on the canvas, outside any live region.
                            announce('Undid the last change');
                        }}
                    >
                        <Undo2 className="size-4" aria-hidden />
                    </Button>
                </Tooltip>
                <Tooltip label="Redo">
                    <Button
                        size="icon"
                        aria-label="Redo"
                        disabled={!canRedo}
                        onClick={() => {
                            redo();
                            announce('Redid the change');
                        }}
                    >
                        <Redo2 className="size-4" aria-hidden />
                    </Button>
                </Tooltip>
                {/* Clear lives with undo/redo because undo is its safety net. Only on
            the canvas tabs — Outputs has nothing to clear from. `invisible`
            (not unmount) so the mx-auto-centered tabs don't shift on switch;
            visibility:hidden also drops it from the tab order. */}
                <span className={onCanvasView ? 'flex' : 'invisible flex'}>
                    <ConfirmActionDialog
                        tooltip="Clear diagram"
                        icon={<Eraser className="size-4" aria-hidden />}
                        title="Clear the diagram?"
                        description="Removes every subsystem, part, and wire — one empty board stays so you can start from scratch. Undo brings everything back."
                        confirmLabel="Clear"
                        onConfirm={() => {
                            clearDesign();
                            announce('Diagram cleared — undo restores it');
                        }}
                    />
                </span>
                <Separator />
                <Tooltip label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
                    <Button
                        size="icon"
                        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                        onClick={toggle}
                    >
                        {theme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
                    </Button>
                </Tooltip>
                <ConfirmActionDialog
                    tooltip="Reset design"
                    icon={<RotateCcw className="size-4" aria-hidden />}
                    title="Reset the design?"
                    description="The project returns to the seeded sensor gateway — including its three seeded suggestions. Your edits stay on the undo stack."
                    confirmLabel="Reset"
                    onConfirm={() => {
                        reset();
                        announce('Design reset to the seeded sensor gateway');
                    }}
                />
            </div>
        </header>
    );
}
