import { useEffect, useMemo, useRef, useState } from 'react';
import type { dia, mvc } from '@joint/plus';
import {
    FreeTransform,
    Navigator,
    Paper,
    PaperScroller,
    Selection,
    Snaplines,
    useSelectionCollection,
    useCells,
    useGraph,
    useOnPaperEvents,
    usePaperScroller,
    type CellId,
    type CellInteractivity,
    type CellRecord,
    type Computed,
    type NavigatorElementStyleCallback,
    type PaperProps,
    type SelectionFramesOptions,
    type SelectionProps,
} from '@joint/react-plus';
import { specOf } from '../shapes/registry';
import { createSurfaceDefs, SurfaceDefsContext } from '../shapes/surface';
import { isShapeData } from '../shapes/shape-data';
import { ShapeNode } from '../shapes/shape-node';
import { connectionStrategy, GRID_SIZE, validateConnection } from './connection-rules';
import { FIT_OPTIONS, PAPER_ID } from './paper-id';
import { usePreferences } from './preferences';
import { PlantControls, RunMode } from '../runtime';
import { CellMenu } from './cell-menu';
import { ANCHOR_NAMESPACE } from './grid-side-anchor';
import { EditInteractions } from './edit-interactions';
import { isDuplicateEvent } from './stencil-drag';
import { isGroupCell } from './group-levels';
import { DerivedPorts } from './derived-ports';
import { GroupFrames } from './groups';
import { SurfaceDefsHost } from './surface-defs-host';
import { KeyboardShortcuts } from './keyboard-shortcuts';
import { connectedPortsOf } from './selectors';
import { transformPropsOf } from './transform';
import './canvas.css';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
// A click still counts as a click when the pointer moves this much, and moves nothing.
const CLICK_THRESHOLD = 10;
// How far around the selected shapes their frame is.
const SELECTION_PADDING = 6;
const SELECTION_COLOR = '#0075F2';
// A thick line of the grid every this many thin ones.
const MAJOR_GRID_FACTOR = 5;

/** The grid while editing: thin lines and thick ones, in the tones of the canvas. */
const GRID: PaperProps['drawGrid'] = {
    name: 'doubleMesh',
    args: [
        { color: 'var(--canvas-grid)', thickness: 1 },
        { color: 'var(--canvas-grid-major)', thickness: 1.5, scaleFactor: MAJOR_GRID_FACTOR },
    ],
};

/**
 * The defaults of the links: an end at a port is anchored at its center (rotated with the element), an end on
 * a side at the anchor the connection strategy put there; each link has its own router and connector.
 */
const LINK_DEFAULTS: PaperProps['linkRouting'] = {
    defaultAnchor: { name: 'center', args: { useModelGeometry: true, rotate: true } },
    defaultConnectionPoint: { name: 'anchor' },
};

// A dragged link end snaps to the ports (or the sides) nearby, and in line with the other points of its link.
const SNAP_LINKS = { radius: 2 * GRID_SIZE };
const SNAP_LINKS_SELF = { distance: GRID_SIZE };

/** Where a dragged link end would connect: outlined in the color of the selection. */
const HIGHLIGHTING: PaperProps['highlighting'] = {
    connecting: { name: 'mask', options: { padding: 3, attrs: { stroke: SELECTION_COLOR, strokeWidth: 2, strokeLinejoin: 'round' } } },
};

/**
 * What the user can do with a cell while editing: move the elements, move a link as a whole only while it is
 * attached to nothing; the links come from the palette, not from the ports. A selected member of a group moves on
 * its own, any other one moves the group it is in.
 */
const editInteractivityOf = (selection: mvc.Collection<dia.Cell>): CellInteractivity => ({ model }) => ({
    elementMove: true,
    linkMove: model.isLink() && !model.getSourceCell() && !model.getTargetCell(),
    addLinkFromMagnet: false,
    labelMove: false,
    stopDelegation: selection.has(model),
});

/** A drag with Cmd / Ctrl drags a copy of the pressed cell: the selection doesn't move. */
const ALLOW_TRANSLATE: SelectionProps['allowTranslate'] = ({ event }) => !isDuplicateEvent(event);

/** The frame of a selected group is dashed (it draws nothing of its own). */
const FRAMES: SelectionFramesOptions = { className: (model) => (isGroupCell(model) ? 'scada-group-frame' : '') };

// The screen doesn't snap to the elements; they snap to it.
const canSnap = (view: { readonly model: { get: (key: string) => unknown } }) => {
    const data = view.model.get('data');
    return !isShapeData(data) || data.kind !== 'Screen';
};

/** The minimap: the elements in a flat tone, the locked ones (a background) and the groups (no drawing) left out. */
const MINIMAP_STYLE: NavigatorElementStyleCallback<unknown> = ({ record }) => {
    const isHidden = isShapeData(record.data) && (record.data.locked === true || record.data.kind === 'Group');
    return isHidden ? { display: 'none' } : { fill: 'var(--shape-metal-pale)', stroke: 'none' };
};

const selectIds = (cells: ReadonlyArray<Computed<CellRecord>>): readonly CellId[] => cells.map((cell) => cell.id);
const isSameIds = (a: readonly CellId[], b: readonly CellId[]) => a.length === b.length && a.every((id, index) => id === b[index]);

/** The resize and rotate handles of the one selected element: not shorter than its connected ports take. */
function SelectedElementHandles({ id }: { readonly id: CellId }) {
    // By `useCells`: a cell selected before the store has it (just added), or removed meanwhile, resolves to none.
    const kind = useCells(id, (cell) => (cell?.type === 'element' && isShapeData(cell.data) ? cell.data.kind : undefined));
    const connected = useCells((cells) => connectedPortsOf(cells, id));
    const spec = specOf(kind);
    if (!spec || spec.kind === 'Group') {
        return null;
    }
    const connectedPorts = connected === '' ? [] : connected.split(' ');
    return <FreeTransform cell={id} {...transformPropsOf(spec, connectedPorts)} usePaperScale padding={SELECTION_PADDING} />;
}

/** The handles of the selection: an element alone can be resized and rotated. */
function SelectionHandles() {
    const { collection } = useSelectionCollection();
    const ids = useCells(collection, selectIds, isSameIds);
    if (ids.length !== 1) {
        return null;
    }
    return <SelectedElementHandles key={ids[0]} id={ids[0]} />;
}

// In run mode the diagram is fitted larger than its size too: the panels are hidden, there is room for it.
const RUN_FIT_OPTIONS = { ...FIT_OPTIONS, padding: 50, maxScale: 2 };

/**
 * Fits the view when a diagram is opened and when the mode changes, once it is rendered: in run mode a screen fills
 * the window (what the operator sees), otherwise the whole diagram.
 */
function FitView({ version, isRunning }: { readonly version: number; readonly isRunning: boolean }) {
    const { paperScroller, zoomToFit } = usePaperScroller(PAPER_ID);
    const { graph } = useGraph();
    const fitted = useRef('');
    const fit = () => {
        const key = `${version} ${isRunning}`;
        if (fitted.current === key || !paperScroller) {
            return;
        }
        fitted.current = key;
        if (graph.getCells().length === 0) {
            return;
        }
        const screen = isRunning ? graph.getElements().find((element) => {
            const data: unknown = element.get('data');
            return isShapeData(data) && data.kind === 'Screen';
        }) : undefined;
        if (screen) {
            paperScroller.zoomToRect(screen.getBBox(), { padding: 0, maxScale: Infinity });
            return;
        }
        zoomToFit(isRunning ? RUN_FIT_OPTIONS : FIT_OPTIONS);
    };
    useOnPaperEvents(PAPER_ID, { 'render:done': fit });
    // After the layout of the commit (the panels shown or hidden resize the canvas): zooming then also updates the
    // scroller's React state outside of React's render.
    useEffect(() => {
        const frame = requestAnimationFrame(fit);
        return () => cancelAnimationFrame(frame);
    });
    return null;
}

interface DiagramCanvasProps {
    readonly isRunning: boolean;
    /** The minimap: off on a phone. */
    readonly hasMinimap: boolean;
    /** Bumped when another diagram is opened: the view is fitted to it. */
    readonly diagramVersion: number;
}

/** The diagram in a scrollable, zoomable paper: edited, or run (nothing moves but the plant). */
export function DiagramCanvas({ isRunning, hasMinimap, diagramVersion }: DiagramCanvasProps) {
    const [preferences] = usePreferences();
    const { collection } = useSelectionCollection();
    const editInteractivity = useMemo(() => editInteractivityOf(collection), [collection]);
    // The gradients of the surfaces, once in the paper (not in each element).
    const [surfaceDefs] = useState(createSurfaceDefs);
    return (
        <SurfaceDefsContext value={surfaceDefs}>
            <div className="scada-canvas relative size-full">
                <PaperScroller className="scada-scroller size-full touch-none" minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM} tabIndex={0} role="application" aria-label={isRunning ? 'Plant, running' : 'Plant diagram, editing'}>
                    <Paper
                        id={PAPER_ID}
                        className="scada-diagram size-full"
                        renderElement={ShapeNode}
                        gridSize={GRID_SIZE}
                        drawGrid={isRunning ? false : GRID}
                        drawGridSize={2 * GRID_SIZE}
                        linkRouting={LINK_DEFAULTS}
                        anchorNamespace={ANCHOR_NAMESPACE}
                        connectionStrategy={connectionStrategy}
                        validateConnection={validateConnection}
                        snapLinks={SNAP_LINKS}
                        snapLinksSelf={SNAP_LINKS_SELF}
                        highlighting={HIGHLIGHTING}
                        linkPinning
                        interactive={isRunning ? false : editInteractivity}
                        clickThreshold={CLICK_THRESHOLD}
                        moveThreshold={CLICK_THRESHOLD}
                    >
                        {!isRunning && <Selection wrapper={false} frames={FRAMES} allowTranslate={ALLOW_TRANSLATE} />}
                        <SurfaceDefsHost surfaceDefs={surfaceDefs} />
                        <DerivedPorts />
                        {!isRunning && <GroupFrames />}
                        {!isRunning && <SelectionHandles />}
                        {!isRunning && preferences.snaplines && <Snaplines usePaperGrid canSnap={canSnap} />}
                        {isRunning ? <RunMode /> : <PlantControls isInert />}
                    </Paper>
                    <FitView version={diagramVersion} isRunning={isRunning} />
                    {!isRunning && <CellMenu />}
                    {!isRunning && <KeyboardShortcuts />}
                    {!isRunning && <EditInteractions />}
                </PaperScroller>
                {hasMinimap && !isRunning && (
                    <div className="absolute right-3 bottom-3 z-20 w-56 overflow-hidden rounded-lg border border-rule bg-paper-2 shadow-[var(--shadow-panel)]">
                        <Navigator paper={PAPER_ID} elementStyle={MINIMAP_STYLE} showLinks={false} className="h-36 bg-[var(--shape-canvas)]" aria-label="Minimap" />
                    </div>
                )}
            </div>
        </SurfaceDefsContext>
    );
}
