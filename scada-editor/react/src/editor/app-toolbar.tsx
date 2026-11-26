import { useRef, type ReactNode } from 'react';
import {
    Download,
    FilePlus2,
    FolderOpen,
    Image,
    Maximize,
    Moon,
    PanelLeft,
    PanelRight,
    Pencil,
    Play,
    Redo2,
    Scan,
    Search,
    Settings,
    Sun,
    Undo2,
    ZoomIn,
    ZoomOut,
    ScrollText,
    X,
} from 'lucide-react';
import { useGraphHistory, useGraphHistoryStack, usePaperScroller } from '@joint/react-plus';
import { MODIFIER_KEY } from '../ui/keys';
import { FIT_OPTIONS, PAPER_ID, ZOOM_STEP } from './paper-id';

function Group({ children }: { readonly children: ReactNode }) {
    return <div className="flex items-center gap-1">{children}</div>;
}

interface IconKeyProps {
    readonly label: string;
    readonly hint?: string;
    readonly onClick: () => void;
    readonly isDisabled?: boolean;
    readonly isPressed?: boolean;
    readonly children: ReactNode;
}

/** A toolbar button with an icon only: its name for screen readers, its hint as the tooltip. */
function IconKey({ label, hint, onClick, isDisabled = false, isPressed, children }: IconKeyProps) {
    return (
        <button type="button" className="key" onClick={onClick} disabled={isDisabled} aria-label={label} aria-pressed={isPressed} title={hint ?? label}>
            {children}
        </button>
    );
}

/** What the toolbar asks the app to do. */
export interface ToolbarActions {
    readonly onNew: () => void;
    readonly onOpenFile: (file: File) => void;
    readonly onSave: () => void;
    readonly onExportImage: () => void;
    readonly onToggleSettings: () => void;
    readonly onToggleFind: () => void;
    readonly onToggleLog: () => void;
    readonly onTogglePalette: () => void;
    readonly onToggleInspector: () => void;
    readonly onToggleTheme: () => void;
    readonly onModeChange: (isRunning: boolean) => void;
}

interface AppToolbarProps extends ToolbarActions {
    readonly isRunning: boolean;
    readonly isDark: boolean;
    readonly isPaletteShown: boolean;
    readonly isInspectorShown: boolean;
    readonly isSettingsOpen: boolean;
    readonly isFindOpen: boolean;
    /** A phone: the examples run, nothing edited - the title and light / dark on the page, light / dark and Exit running. */
    readonly isPhone: boolean;
}

const canFullScreen = typeof document !== 'undefined' && document.fullscreenEnabled;

/** The whole page full screen, or back. */
function toggleFullScreen() {
    if (document.fullscreenElement) {
        void document.exitFullscreen();
    } else {
        void document.documentElement.requestFullscreen();
    }
}

/**
 * The toolbar: the title, the file (edit mode), the history (edit mode), the zoom, the settings (edit mode) or the
 * log (run mode), Find, the panels (edit mode), full screen, light / dark, and the mode button.
 */
export function AppToolbar(props: AppToolbarProps) {
    const { isRunning, isDark } = props;
    const { undo, redo } = useGraphHistory();
    const { canUndo, canRedo } = useGraphHistoryStack();
    const { setZoom, zoomToFit } = usePaperScroller(PAPER_ID);
    const fileInput = useRef<HTMLInputElement>(null);
    const iconSize = 'size-4';

    if (props.isPhone) {
        const themeKey = <IconKey label="Light / dark" onClick={props.onToggleTheme}>{isDark ? <Sun className={iconSize} aria-hidden /> : <Moon className={iconSize} aria-hidden />}</IconKey>;
        // Running: no bar - its buttons float over the diagram, which has the whole height.
        return isRunning ? (
            <header className="scada-toolbar absolute top-2 right-2 z-40 flex items-center gap-2">
                {themeKey}
                <button type="button" className="key key-primary" onClick={() => props.onModeChange(false)} title="Back to the examples">
                    <X className={iconSize} aria-hidden /> Exit
                </button>
            </header>
        ) : (
            <header className="scada-toolbar flex h-14 shrink-0 items-center justify-between gap-3 border-b border-rule bg-paper-2 px-3">
                <h1 className="font-display text-base font-semibold tracking-tight text-ink">SCADA Editor</h1>
                {themeKey}
            </header>
        );
    }

    return (
        <header className="scada-toolbar flex h-14 shrink-0 items-center gap-3 border-b border-rule bg-paper-2 px-3">
            <h1 className="mr-2 font-display text-base font-semibold tracking-tight text-ink">SCADA Editor</h1>
            {!isRunning && (
                <Group>
                    <IconKey label="New diagram" hint="A new diagram" onClick={props.onNew}><FilePlus2 className={iconSize} aria-hidden /></IconKey>
                    <IconKey label="Open" hint="Open a diagram (JSON)" onClick={() => fileInput.current?.click()}><FolderOpen className={iconSize} aria-hidden /></IconKey>
                    <IconKey label="Save" hint="Save the diagram (JSON)" onClick={props.onSave}><Download className={iconSize} aria-hidden /></IconKey>
                    <IconKey label="Export image" hint="Export the diagram as an image (WebP): the screen if there is one" onClick={props.onExportImage}><Image className={iconSize} aria-hidden /></IconKey>
                    <input
                        ref={fileInput}
                        type="file"
                        accept="application/json,.json"
                        hidden
                        onChange={(event) => {
                            const [file] = event.target.files ?? [];
                            event.target.value = '';
                            if (file) {
                                props.onOpenFile(file);
                            }
                        }}
                    />
                </Group>
            )}
            {!isRunning && (
                <Group>
                    <IconKey label="Undo" hint={`Undo (${MODIFIER_KEY}Z)`} onClick={undo} isDisabled={!canUndo}><Undo2 className={iconSize} aria-hidden /></IconKey>
                    <IconKey label="Redo" hint={`Redo (${MODIFIER_KEY}Y)`} onClick={redo} isDisabled={!canRedo}><Redo2 className={iconSize} aria-hidden /></IconKey>
                </Group>
            )}
            <Group>
                <IconKey label="Zoom out" onClick={() => setZoom((zoom) => zoom / ZOOM_STEP)}><ZoomOut className={iconSize} aria-hidden /></IconKey>
                <IconKey label="Zoom in" onClick={() => setZoom((zoom) => zoom * ZOOM_STEP)}><ZoomIn className={iconSize} aria-hidden /></IconKey>
                <IconKey label="Zoom to fit" hint="Zoom to fit the diagram" onClick={() => zoomToFit(FIT_OPTIONS)}><Scan className={iconSize} aria-hidden /></IconKey>
            </Group>
            {isRunning ? (
                <button type="button" className="key" onClick={props.onToggleLog} title="The messages between the diagram and the plant: the updates, the commands">
                    <ScrollText className={iconSize} aria-hidden /> Log
                </button>
            ) : (
                <button type="button" className="key" onClick={props.onToggleSettings} aria-pressed={props.isSettingsOpen} title="The settings of the diagram (the screen, the style, the animations) and of the editor">
                    <Settings className={iconSize} aria-hidden /> Settings
                </button>
            )}
            <div className="ml-auto flex items-center gap-3">
                <button type="button" className="key" onClick={props.onToggleFind} aria-pressed={props.isFindOpen} title={`Find a shape by its ID, its name or its kind (${MODIFIER_KEY}F)`}>
                    <Search className={iconSize} aria-hidden /> Find
                </button>
                <Group>
                    {!isRunning && (
                        <>
                            <IconKey label="Palette" hint={`Show / hide the palette (${MODIFIER_KEY}\\ both panels)`} onClick={props.onTogglePalette} isPressed={props.isPaletteShown}><PanelLeft className={iconSize} aria-hidden /></IconKey>
                            <IconKey label="Inspector" hint={`Show / hide the inspector (${MODIFIER_KEY}\\ both panels)`} onClick={props.onToggleInspector} isPressed={props.isInspectorShown}><PanelRight className={iconSize} aria-hidden /></IconKey>
                        </>
                    )}
                    {canFullScreen && <IconKey label="Full screen" onClick={toggleFullScreen}><Maximize className={iconSize} aria-hidden /></IconKey>}
                    <IconKey label="Light / dark" onClick={props.onToggleTheme}>{isDark ? <Sun className={iconSize} aria-hidden /> : <Moon className={iconSize} aria-hidden />}</IconKey>
                </Group>
                <button type="button" className="key key-primary min-w-24" onClick={() => props.onModeChange(!isRunning)} title={isRunning ? 'Back to editing the diagram' : 'Run the plant (the runtime mode)'}>
                    {isRunning ? <Pencil className={iconSize} aria-hidden /> : <Play className={iconSize} aria-hidden />}
                    {isRunning ? 'Edit' : 'Run'}
                </button>
            </div>
        </header>
    );
}
