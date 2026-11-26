import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
    Diagram,
    Stencil,
    useGraph,
    useGraphHistory,
    useCells,
    useGraphHistoryStack,
    usePaperScroller,
    useSelectionCollection,
    type CellRecord,
    type Computed,
    type InteractionsOptions,
    type SelectionFilter,
    type StencilApi,
} from '@joint/react-plus';
import { AppShortcuts } from './editor/app-shortcuts';
import { createEscapeLayers, EscapeLayersContext } from './editor/escape-layers';
import { StencilDragBridge } from './editor/edit-interactions';
import { StencilDragContext } from './editor/stencil-drag';
import { FindPanel } from './editor/find-panel';
import { useExportImage } from './editor/use-export-image';
import { PHONE_QUERY, PhoneExamples } from './editor/phone-examples';
import { isShapeData } from './shapes/shape-data';
import { AppToolbar } from './editor/app-toolbar';
import { DiagramCanvas } from './editor/diagram-canvas';
import { PlantLog, TagBadges } from './runtime';
import { EMPTY_META, resetMeta, useDiagramMeta, type DiagramMeta } from './editor/diagram-meta';
import { DiagramMetaProvider } from './editor/diagram-meta-provider';
import { PAPER_ID } from './editor/paper-id';
import { PreferencesContext, usePreferenceState } from './editor/preferences';
import { SidePanel, type PanelContent } from './editor/side-panel';
import { ShapePalette } from './editor/shape-palette';
import { createShape } from './editor/new-cells';
import { diagramOfFile, fileOfDiagram, type Diagram as DiagramFile } from './files/diagram-file';
import { EXAMPLES, type Example } from './files/examples';
import { INITIAL_LAYERS } from './plant/layers';
import { SCREEN } from './shapes/diagram';
import { useMediaQuery } from './ui/use-media-query';
import { DARK_QUERY, useTheme } from './ui/use-theme';

// Undo steps kept: plenty for a session, bounded memory.
const HISTORY = { stackLimit: 200 };
/** A region selects what Select All does: not the screen, a group for its members, not a locked shape; the links too. */
const isRegionSelectable: SelectionFilter = ({ model }) => {
    const data: unknown = model.get('data');
    return !model.isEmbedded() && !(isShapeData(data) && (data.kind === 'Screen' || data.locked === true));
};
/** Editing: the keyboard is the editor's own (it knows the groups and the IDs, see `KeyboardShortcuts`). */
const EDIT_INTERACTIONS: InteractionsOptions = { keyboard: false, selectionRegion: { selectLinks: true, filter: isRegionSelectable } };
// While the plant runs the diagram is not edited: no selection, no shortcuts of the diagram.
const RUN_INTERACTIONS: InteractionsOptions = { keyboard: false, selection: false };
const DIAGRAM_FILE_NAME = 'scada-diagram.json';

/** Whether the diagram has a screen: in run mode it fills the window. */
const selectHasScreen = (cells: ReadonlyArray<Computed<CellRecord>>): boolean =>
    cells.some((cell) => isShapeData(cell.data) && cell.data.kind === 'Screen');

/** The first example, opened on load. */
const INITIAL: DiagramFile = diagramOfFile(EXAMPLES[0].json);
const metaOf = ({ style, images, favorites, animations }: DiagramFile): DiagramMeta => ({ style, images, favorites, animations });
const INITIAL_META = metaOf(INITIAL);

function download(url: string, fileName: string) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
}

interface EditorProps {
    readonly isRunning: boolean;
    readonly setIsRunning: (isRunning: boolean) => void;
    readonly isDark: boolean;
    readonly onToggleTheme: () => void;
}

/** The editor inside the diagram: the toolbar, the palette, the canvas and the side panel, in two modes. */
function Editor({ isRunning, setIsRunning, isDark, onToggleTheme }: EditorProps) {
    const { meta } = useDiagramMeta();
    const { graph, resetCells, exportToJSON } = useGraph();
    const { resetHistory } = useGraphHistory();
    const { canUndo } = useGraphHistoryStack();
    const { selectCells } = useSelectionCollection();
    const [isPaletteShown, setIsPaletteShown] = useState(true);
    const [isInspectorShown, setIsInspectorShown] = useState(true);
    const [panel, setPanel] = useState<PanelContent>({ kind: 'selection' });
    const [diagramVersion, setDiagramVersion] = useState(0);
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [isFindOpen, setIsFindOpen] = useState(false);
    const [findFocusRequest, setFindFocusRequest] = useState(0);
    const exportImage = useExportImage();
    const hasScreen = useCells(selectHasScreen);
    const isPhone = useMediaQuery(PHONE_QUERY);
    const { paperScroller } = usePaperScroller(PAPER_ID);
    const main = useRef<HTMLElement>(null);
    const stencilDrag = useRef<StencilApi['startCellDrag'] | null>(null);
    const [escapeLayers] = useState(createEscapeLayers);
    // The middle of the view before a panel was hidden or shown (on the screen, on the diagram): the diagram stays
    // in place on the screen.
    const viewBefore = useRef<{ readonly clientX: number; readonly x: number; readonly y: number } | null>(null);

    /** The middle of the canvas on the screen. */
    const canvasMiddle = () => {
        const box = main.current?.getBoundingClientRect();
        return box ? box.left + box.width / 2 : null;
    };

    /** The panels hidden or shown, the diagram where it is on the screen. */
    const setPanels = (palette: boolean, inspector: boolean) => {
        const clientX = canvasMiddle();
        const middle = paperScroller?.getVisibleArea().center();
        viewBefore.current = clientX === null || !middle ? null : { clientX, x: middle.x, y: middle.y };
        setIsPaletteShown(palette);
        setIsInspectorShown(inspector);
    };

    useLayoutEffect(() => {
        const before = viewBefore.current;
        viewBefore.current = null;
        const clientX = canvasMiddle();
        if (!before || clientX === null || !paperScroller) {
            return;
        }
        paperScroller.center(before.x + (clientX - before.clientX) / paperScroller.zoom(), before.y);
    }, [isPaletteShown, isInspectorShown, paperScroller]);

    /** Find and the log are open one at a time. */
    const openFind = () => {
        setIsLogOpen(false);
        setIsFindOpen(true);
        setFindFocusRequest((request) => request + 1);
    };

    /**
     * Replace the diagram (asked first when it was changed - its cells or its settings, both in the history) by one
     * already read in full (`diagramOfFile()` refuses a file before anything changes): its cells, its own settings,
     * a fresh history.
     */
    const replaceDiagram = (diagram: DiagramFile, question: string): boolean => {
        if (canUndo && !window.confirm(`${question} The changes of the diagram will be lost.`)) {
            return false;
        }
        // Nothing selected first: the selection (and its handles) would hold the cells about to be removed.
        selectCells([]);
        resetMeta(graph, metaOf(diagram));
        resetCells([...diagram.cells]);
        resetHistory();
        setDiagramVersion((version) => version + 1);
        return true;
    };

    const actions = {
        onNew: () => {
            const isReplaced = replaceDiagram({ ...EMPTY_META, favorites: meta.favorites, cells: [createShape(SCREEN)] }, 'Start a new diagram?');
            if (isReplaced) {
                setPanel({ kind: 'settings' });
            }
        },
        onOpenFile: async (file: File) => {
            try {
                replaceDiagram(diagramOfFile(JSON.parse(await file.text())), 'Open a diagram?');
            } catch (error) {
                window.alert(`"${file.name}" is not a diagram (${error instanceof Error ? error.message : String(error)}).`);
            }
        },
        onSave: () => {
            const json = fileOfDiagram({ ...meta, cells: exportToJSON().cells });
            const url = URL.createObjectURL(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }));
            download(url, DIAGRAM_FILE_NAME);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        onExportImage: exportImage,
        onToggleSettings: () => setPanel((current) => (current.kind === 'settings' ? { kind: 'selection' } : { kind: 'settings' })),
        onToggleFind: () => (isFindOpen ? setIsFindOpen(false) : openFind()),
        onToggleLog: () => {
            setIsFindOpen(false);
            setIsLogOpen((isOpen) => !isOpen);
        },
        onTogglePalette: () => setPanels(!isPaletteShown, isInspectorShown),
        onToggleInspector: () => setPanels(isPaletteShown, !isInspectorShown),
        onToggleTheme,
        onModeChange: (next: boolean) => {
            selectCells([]);
            setIsLogOpen(false);
            setIsFindOpen(false);
            setIsRunning(next);
        },
    };

    const openExample = (example: Example) => replaceDiagram(diagramOfFile(example.json), `Open the ${example.name} example?`);

    return (
        <EscapeLayersContext value={escapeLayers}>
            <StencilDragContext value={stencilDrag}>
                <div className="scada-app flex h-full flex-col bg-paper text-ink" data-mode={isRunning ? 'run' : 'edit'} data-screen={isRunning && hasScreen && !isPhone ? 'shown' : undefined} data-animations={isRunning ? meta.animations : undefined}>
                    <AppToolbar
                        {...actions}
                        isRunning={isRunning}
                        isDark={isDark}
                        isPaletteShown={isPaletteShown}
                        isInspectorShown={isInspectorShown}
                        isSettingsOpen={panel.kind === 'settings'}
                        isFindOpen={isFindOpen}
                        isPhone={isPhone}
                    />
                    <AppShortcuts
                        onFind={openFind}
                        onTogglePanels={isRunning ? undefined : () => {
                            const isAnyShown = isPaletteShown || isInspectorShown;
                            setPanels(!isAnyShown, !isAnyShown);
                        }}
                    />
                    <div className="relative flex min-h-0 flex-1">
                        {/* Hidden, not removed: its stencil drags the copies of the canvas too (Cmd + drag). */}
                        {!isRunning && !isPhone && (
                            <aside aria-label="Palette" hidden={!isPaletteShown} className="w-64 shrink-0 overflow-hidden border-r border-rule bg-paper-2">
                                <Stencil paper={PAPER_ID} className="h-full">
                                    <ShapePalette onPreview={(kind) => setPanel({ kind: 'preview', shape: kind })} />
                                    <StencilDragBridge />
                                </Stencil>
                            </aside>
                        )}
                        <main ref={main} className="relative min-w-0 flex-1">
                            {/* On a phone the canvas is hidden under the examples, not removed: the texts are measured. */}
                            <div className={isPhone && !isRunning ? 'invisible size-full' : 'size-full'}>
                                <DiagramCanvas isRunning={isRunning} hasMinimap={!isPhone} diagramVersion={diagramVersion} />
                            </div>
                            {isPhone && !isRunning && (
                                <PhoneExamples
                                    onPick={(example) => {
                                        if (openExample(example)) {
                                            actions.onModeChange(true);
                                        }
                                    }}
                                />
                            )}
                            {isFindOpen && <FindPanel className="absolute top-3 right-3 z-30" isRunning={isRunning} focusRequest={findFocusRequest} onClose={() => setIsFindOpen(false)} />}
                            {isRunning && <PlantLog className="absolute top-3 right-3 z-30" isOpen={isLogOpen} onIsOpenChange={setIsLogOpen} />}
                            <TagBadges />
                        </main>
                        {!isRunning && !isPhone && isInspectorShown && (
                            <aside aria-label="Inspector" className="w-80 shrink-0 overflow-y-auto border-l border-rule bg-paper-2">
                                <SidePanel content={panel} onContentChange={setPanel} onOpenExample={openExample} />
                            </aside>
                        )}
                    </div>
                </div>
            </StencilDragContext>
        </EscapeLayersContext>
    );
}

/** The SCADA editor: one diagram, its own settings (style, images, favorites) and the editor's preferences. */
export function ScadaApp(): ReactNode {
    const preferences = usePreferenceState();
    const [theme, setTheme] = useTheme();
    const isSystemDark = useMediaQuery(DARK_QUERY);
    const isDark = theme === 'dark' || (theme === 'system' && isSystemDark);
    const [isRunning, setIsRunning] = useState(false);

    return (
        <PreferencesContext value={preferences}>
            <Diagram initialLayers={INITIAL_LAYERS} initialCells={INITIAL.cells} history={HISTORY} clipboard interactions={isRunning ? RUN_INTERACTIONS : EDIT_INTERACTIONS}>
                <DiagramMetaProvider initialMeta={INITIAL_META}>
                    <Editor isRunning={isRunning} setIsRunning={setIsRunning} isDark={isDark} onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')} />
                </DiagramMetaProvider>
            </Diagram>
        </PreferencesContext>
    );
}
