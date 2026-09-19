import { dia } from '@joint/plus';
import { Diagram, Paper, PaperScroller } from '@joint/react-plus';
import type { CellVisibility, InteractionsOptions } from '@joint/react-plus';
import type { ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';

import { Cell } from './cells/cell';
import { EditorProvider, EditorWiring } from './editor';
import { useEditor } from './editor-context';
import { isCellVisible } from './layout';
import { gateAnchor } from './layout/gate-anchor';
import { LinkContent } from './link-view';
import { Inspector } from './inspector';
import { Menu } from './menu';
import { COLORS, cellNamespace } from './shapes';
import { Toolbar } from './toolbar';
import { TOOLTIP_ID } from './use-tooltip';

/** Captures nothing, so a module-level constant keeps a stable identity. */
const cellVisibility: CellVisibility = ({ model }) => isCellVisible(model);

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
                            <PaperScroller className="scroller" cursor="grab" scrollWhileDragging={false}>
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
                        </div>
                        <Inspector />
                    </div>
                    <MenuLayer />
                    {/* The one tooltip; the buttons register with it after they mount (see `use-tooltip.ts`). Its stylesheet is imported into the cascade layer (see `index.css`), not injected. */}
                    <Tooltip id={TOOLTIP_ID} className="tooltip" delayShow={500} place="bottom" disableStyleInjection />
                </Stage>
            </EditorProvider>
        </Diagram>
    );
}
