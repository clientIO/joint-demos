import { useEffect, useLayoutEffect, useRef } from 'react';
import {
    Paper,
    PaperScroller,
    Selection,
    Snaplines,
    getSelectionDefaultHandle,
    linkRoutingOrthogonal,
    useGraph,
    useOnPaperEvents,
    usePaperScroller,
    type DefaultLink,
    type PaperProps,
} from '@joint/react-plus';
import { pipeLook } from '../plant/cells';
import { isElectricalPort } from '../shapes/catalog';
import { EquipmentNode } from '../shapes/equipment-node';
import { useUniqueTags } from '../plant/use-unique-tags';
import { ContextMenu } from './context-menu';
import { FIT_OPTIONS, PAPER_ID } from './paper-id';
import { ViewControls } from './view-controls';

const GRID_SIZE = 8;
// How far a routed pipe keeps from the equipment it passes.
const ROUTING_MARGIN = 16;
const LINK_ROUTING = linkRoutingOrthogonal({ margin: ROUTING_MARGIN });
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
// How close to a port a dragged pipe end snaps to it.
const SNAP_LINKS = { radius: 24 };
// A touch tap jitters: under this many pixels of travel the plant gets a click, not a drag.
const CLICK_THRESHOLD = 8;

// A pipe joins two pipe stubs, a wire two electrical terminals: never one of each.
const VALIDATE_CONNECTION: NonNullable<PaperProps['validateConnection']> = {
    allowRootConnection: false,
    validate: ({ source, target }) => isElectricalPort(source.port ?? undefined) === isElectricalPort(target.port ?? undefined),
};

// A new connection is a water pipe, or a wire when drawn from a terminal.
const DEFAULT_LINK: DefaultLink = ({ source }) => {
    const medium = isElectricalPort(source.port ?? undefined) ? 'power' : 'water';
    return { ...pipeLook(medium), data: { medium }};
};

// A shape moves by a plain drag and connects from its stubs: the frame keeps delete only.
const SELECTION_WRAPPER = { handles: () => [getSelectionDefaultHandle('remove')] };

// Fit the diagram into view once it has rendered, on load and when another is opened.
function FitOnLoad({ version }: { readonly version: number }) {
    const { zoomToFit } = usePaperScroller(PAPER_ID);
    const { graph } = useGraph();
    const fittedVersion = useRef(-1);
    useOnPaperEvents(PAPER_ID, {
        'render:done': () => {
            if (fittedVersion.current === version) {
                return;
            }
            fittedVersion.current = version;
            // A new, empty diagram has nothing to fit; the first drop must not zoom the view.
            if (graph.getCells().length > 0) {
                zoomToFit(FIT_OPTIONS);
            }
        },
    });
    return null;
}

// The panels around the canvas come and go with the mode: keep the diagram where
// it was on the screen instead of letting it jump with the canvas's edge.
function useStableViewport(isRunning: boolean) {
    const { paperScroller } = usePaperScroller(PAPER_ID);
    const previousLeft = useRef<number | null>(null);

    // Any other resize (the window, a phone turned) moves the edge too: start from there.
    useEffect(() => {
        if (!paperScroller) {
            return;
        }
        const observer = new ResizeObserver(() => {
            previousLeft.current = paperScroller.el.getBoundingClientRect().left;
        });
        observer.observe(paperScroller.el);
        return () => observer.disconnect();
    }, [paperScroller]);

    // Runs before the observer reports the mode's resize, so it still sees the old edge.
    useLayoutEffect(() => {
        if (!paperScroller) {
            return;
        }
        const left = paperScroller.el.getBoundingClientRect().left;
        const shift = previousLeft.current === null ? 0 : left - previousLeft.current;
        previousLeft.current = left;
        if (shift === 0) {
            return;
        }
        // The scroll position survived the resize: move the view by the edge's shift, in paper units.
        const visible = paperScroller.getVisibleArea();
        const scale = paperScroller.options.paper.scale().sx;
        paperScroller.center(visible.x + shift / scale + visible.width / 2, visible.y + visible.height / 2);
    }, [isRunning, paperScroller]);
}

function UniqueTags() {
    useUniqueTags();
    return null;
}

function StableViewport({ isRunning }: { readonly isRunning: boolean }) {
    useStableViewport(isRunning);
    return null;
}

interface CanvasProps {
    readonly isRunning: boolean;
    /** Bumped when another diagram is opened, to fit it into view. */
    readonly diagramVersion: number;
    /** The minimap and zoom card: off on a phone, which pinches. */
    readonly hasViewCard: boolean;
}

/** The plant diagram in a scrollable, zoomable paper; interactive only while editing. */
export function Canvas({ isRunning, diagramVersion, hasViewCard }: CanvasProps) {
    return (
        <div className="plant relative size-full">
            <PaperScroller
                className="size-full touch-none"
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                tabIndex={0}
                role="application"
                aria-label={isRunning ? 'Plant, running: click a pump, valve or breaker to operate it' : 'Plant diagram, editing'}
            >
                <Paper
                    id={PAPER_ID}
                    className="size-full"
                    renderElement={EquipmentNode}
                    gridSize={GRID_SIZE}
                    drawGrid={{ name: 'dot', args: { color: 'var(--color-grid)', thickness: 1.5 }}}
                    drawGridSize={GRID_SIZE * 2}
                    linkRouting={LINK_ROUTING}
                    defaultLink={DEFAULT_LINK}
                    validateConnection={VALIDATE_CONNECTION}
                    linkPinning={false}
                    snapLinks={SNAP_LINKS}
                    markAvailable
                    interactive={!isRunning}
                    clickThreshold={CLICK_THRESHOLD}
                >
                    {!isRunning && <Selection wrapper={SELECTION_WRAPPER} />}
                    {!isRunning && <Snaplines />}
                </Paper>
                <FitOnLoad version={diagramVersion} />
                <StableViewport isRunning={isRunning} />
                {!isRunning && <ContextMenu />}
                <UniqueTags />
            </PaperScroller>
            {hasViewCard && <ViewControls />}
        </div>
    );
}
