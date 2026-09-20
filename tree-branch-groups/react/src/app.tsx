import { dia, g } from '@joint/plus';
import type { ui } from '@joint/plus';
import { Diagram, Navigator, Paper, PaperScroller } from '@joint/react-plus';
import type { CellVisibility, InteractionsOptions } from '@joint/react-plus';
import type { ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';

import { Cell } from './cells/cell';
import { EditorProvider, EditorWiring, PAPER_PADDING } from './editor';
import { useEditor } from './editor-context';
import { getVisibleBBox, isCellVisible } from './layout';
import { gateAnchor } from './layout/gate-anchor';
import { LinkContent } from './link-view';
import { Inspector } from './inspector';
import { Menu } from './menu';
import { navigatorElementStyle, navigatorLinkStyle } from './navigator-styles';
import { COLORS, cellNamespace } from './shapes';
import { Toolbar } from './toolbar';
import { TOOLTIP_ID } from './use-tooltip';

/** Captures nothing, so a module-level constant keeps a stable identity. */
const cellVisibility: CellVisibility = ({ model }) => isCellVisible(model);

/**
 * The map hides the content of the collapsed groups like the paper does. The
 * navigator of `@joint/react-plus` inherits the routing options of the paper,
 * not its `cellVisibility`: it is given to its own paper here.
 */
const NAVIGATOR_OPTIONS = {
    paperOptions: { cellVisibility: (cell: dia.Cell) => isCellVisible(cell) },
    // The map fits the rendered content, not the graph: the graph also holds the content of the collapsed groups.
    useContentBBox: true
};

/** The paper grows to fit the visible cells, with a small margin - the graph also holds the content of the collapsed groups. */
const SCROLLER_OPTIONS = {
    padding: PAPER_PADDING,
    contentOptions: (scroller: ui.PaperScroller) => ({ useModelGeometry: true, contentArea: getVisibleBBox(scroller.options.paper.model) ?? new g.Rect() })
};

/**
 * Native paper options the React props do not expose. The links meet a
 * group where its gates are; both ends are computed from the models: a group
 * has no view, and the nodes are rendered by React after the models change.
 */
const PAPER_OPTIONS: dia.Paper.Options = {
    defaultAnchor: gateAnchor,
    defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }},
    defaultConnector: { name: 'straight', args: { cornerType: 'cubic', cornerRadius: 6 }},
    sorting: dia.Paper.sorting.APPROX
};

/** The scroller pans and zooms; the selection, the history and the clipboard of the diagram are the editor's own. */
const INTERACTIONS: InteractionsOptions = {
    paperScroller: true,
    selection: false,
    selectionRegion: false,
    clipboard: false,
    commandManager: false,
    keyboard: true,
    wheelAction: 'pan'
};

/** Every element renders through `<Cell>`, every link's content through `<LinkContent>`. */
const renderElement = (): ReactNode => <Cell />;
const renderLink = (): ReactNode => <LinkContent />;

/** The one menu of the app, when one is open (see `menu.tsx`). */
function MenuLayer(): ReactNode {
    const { menu, closeMenu } = useEditor();
    return menu ? <Menu request={menu} onClose={closeMenu} /> : null;
}

/** The class on the stage while a move is on: the hint shows, the "more" buttons hide. */
function Stage({ children }: { children: ReactNode }): ReactNode {
    const { moved } = useEditor();
    return (
        <div className={`app${moved ? ' moving-mode' : ''}`}>
            {children}
        </div>
    );
}

export function App(): ReactNode {
    return (
        <Diagram cellNamespace={cellNamespace} interactions={INTERACTIONS}>
            <EditorProvider>
                <Stage>
                    <Toolbar />
                    <div className="main">
                        <div className="stage">
                            <PaperScroller className="scroller" cursor="grab" scrollWhileDragging={false} options={SCROLLER_OPTIONS}>
                                <Paper
                                    className="paper"
                                    renderElement={renderElement}
                                    renderLink={renderLink}
                                    cellVisibility={cellVisibility}
                                    interactive={false}
                                    overflow
                                    clickThreshold={10}
                                    gridSize={1}
                                    background={{ color: COLORS.background }}
                                    options={PAPER_OPTIONS}
                                >
                                    <EditorWiring />
                                </Paper>
                            </PaperScroller>
                            <div className="move-hint">Choose where to move it &mdash; <kbd>Esc</kbd> cancels</div>
                            {/* The map of the diagram, floating over the corner of the paper: the elements as rects, pills and circles in their colors, the links as lines. */}
                            <Navigator className="navigator" padding={8} useContentBBox dynamicZoom={false} showLinks elementStyle={navigatorElementStyle} linkStyle={navigatorLinkStyle} options={NAVIGATOR_OPTIONS} />
                        </div>
                        <div className="side">
                            <Inspector />
                        </div>
                    </div>
                    <MenuLayer />
                    {/* The one tooltip; the buttons register with it after they mount (see `use-tooltip.ts`). Its stylesheet is imported into the cascade layer (see `index.css`), not injected. */}
                    <Tooltip id={TOOLTIP_ID} className="tooltip" delayShow={500} place="bottom" disableStyleInjection />
                </Stage>
            </EditorProvider>
        </Diagram>
    );
}
