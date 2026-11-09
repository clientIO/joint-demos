import { useState, type ReactNode } from 'react';
import { PanelBottom, Shapes, X } from 'lucide-react';
import { Diagram, Stencil } from '@joint/react-plus';
import { JointJSBadge } from './brand/jointjs-badge';
import { Canvas } from './editor/canvas';
import { PAPER_ID } from './editor/paper-id';
import { Inspector } from './editor/inspector';
import { Palette } from './editor/palette';
import { PlantProvider, RunPanel } from './editor/run-panel';
import { Toolbar } from './editor/toolbar';
import { EXAMPLES } from './examples';
import { INITIAL_LAYERS } from './plant/layers';
import { useMediaQuery } from './ui/use-media-query';
import { useTheme } from './ui/use-theme';

const PHONE_QUERY = '(max-width: 47.99rem)';
// Undo steps kept: plenty for a session, bounded memory.
const HISTORY = { stackLimit: 200 };
// While the plant runs the diagram is not edited: no undo, redo or paste by the keyboard,
// or an undo would fight the plant's restore when editing resumes.
const RUN_INTERACTIONS = { commandManager: false, clipboard: false, selection: false };

type Sheet = 'none' | 'palette' | 'panel';

/** A side panel on a desktop, a bottom sheet on a phone. */
function Dock({
    side,
    label,
    isPhone,
    isOpen,
    onClose,
    children,
}: {
    readonly side: 'left' | 'right';
    readonly label: string;
    readonly isPhone: boolean;
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly children: ReactNode;
}) {
    if (isPhone) {
        if (!isOpen) {
            return null;
        }
        return (
            <aside aria-label={label} className="dock dock-sheet absolute inset-x-0 bottom-0 z-30 flex max-h-[55%] flex-col rounded-t-xl border-t border-rule bg-paper-2 shadow-[var(--shadow-panel)]">
                <div className="flex items-center justify-between border-b border-rule px-4 py-2">
                    <span className="font-display text-sm font-medium text-muted">{label}</span>
                    <button type="button" className="key" onClick={onClose} aria-label={`Close ${label.toLowerCase()}`}><X className="size-4" aria-hidden /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            </aside>
        );
    }
    return (
        <aside aria-label={label} className={`dock relative z-10 min-h-0 shrink-0 overflow-y-auto bg-paper-2 ${side === 'left' ? 'dock-left w-60 border-r' : 'dock-right w-80 border-l'} border-rule`}>
            {children}
        </aside>
    );
}

/** The SCADA editor: toolbar, palette, canvas and the inspector or run panel. */
export function App() {
    const [isRunning, setIsRunning] = useState(false);
    const [diagramVersion, setDiagramVersion] = useState(0);
    const [sheet, setSheet] = useState<Sheet>('none');
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useTheme();
    const isPhone = useMediaQuery(PHONE_QUERY);

    const changeMode = (next: boolean) => {
        setIsRunning(next);
        setSheet('none');
    };

    return (
        <Diagram initialLayers={INITIAL_LAYERS} initialCells={EXAMPLES[0].cells} history={HISTORY} clipboard interactions={isRunning ? RUN_INTERACTIONS : true}>
            <div className="flex h-full flex-col bg-paper text-ink" data-mode={isRunning ? 'run' : 'edit'}>
                <Toolbar
                    isRunning={isRunning}
                    onRunningChange={changeMode}
                    onDiagramOpened={() => setDiagramVersion((version) => version + 1)}
                    theme={theme}
                    onThemeChange={setTheme}
                    onError={setError}
                />
                {error && (
                    <div role="alert" className="flex items-center gap-3 border-b border-rule bg-paper-2 px-4 py-2 text-sm text-error">
                        {error}
                        <button type="button" className="key ml-auto" onClick={() => setError(null)}>Dismiss</button>
                    </div>
                )}
                <div className="relative flex min-h-0 flex-1">
                    {!isRunning && (
                        <Dock side="left" label="Equipment" isPhone={isPhone} isOpen={sheet === 'palette'} onClose={() => setSheet('none')}>
                            <Stencil paper={PAPER_ID} className="h-full">
                                <Palette />
                            </Stencil>
                        </Dock>
                    )}
                    <main className="relative min-w-0 flex-1">
                        <Canvas isRunning={isRunning} diagramVersion={diagramVersion} hasViewCard={!isPhone} />
                        <div className="absolute bottom-3 left-3 z-20 drop-shadow-[0_2px_6px_oklch(0%_0_0/0.25)]">
                            <JointJSBadge />
                        </div>
                        {isPhone && sheet === 'none' && (
                            <div className="absolute right-3 bottom-3 z-20 flex gap-2">
                                {!isRunning && (
                                    <button type="button" className="key key-primary" onClick={() => setSheet('palette')}>
                                        <Shapes className="size-4" aria-hidden /> Add
                                    </button>
                                )}
                                <button type="button" className="key" onClick={() => setSheet('panel')}>
                                    <PanelBottom className="size-4" aria-hidden /> {isRunning ? 'Controls & log' : 'Inspector'}
                                </button>
                            </div>
                        )}
                    </main>
                    {isRunning ? (
                        <PlantProvider>
                            <Dock side="right" label="Controls and log" isPhone={isPhone} isOpen={sheet === 'panel'} onClose={() => setSheet('none')}>
                                <RunPanel />
                            </Dock>
                        </PlantProvider>
                    ) : (
                        <Dock side="right" label="Inspector" isPhone={isPhone} isOpen={sheet === 'panel'} onClose={() => setSheet('none')}>
                            <Inspector />
                        </Dock>
                    )}
                </div>
            </div>
        </Diagram>
    );
}
