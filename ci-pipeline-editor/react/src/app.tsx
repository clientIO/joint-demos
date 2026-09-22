import { Diagram, Paper, PaperScroller, useCells, useSelectionCollection } from '@joint/react-plus';
import type { CellVisibility, InteractionsOptions } from '@joint/react-plus';
import type { ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';

import { describeMoved } from './actions';
import { getId } from './data/build';
import { EditorProvider } from './editor-provider';
import { PAPER_ID, useEditor } from './editor-context';
import { isCellVisible } from './layout';
import { Inspector } from './components/inspector';
import { Menu } from './components/menu';
import { Minimap } from './components/minimap';
import { PaperInteractions } from './components/paper-interactions';
import { DiagramSelection } from './components/selection';
import { COLORS, ElementContent, LinkContent, cellNamespace } from './shapes';
import { PLUS_PATH } from './shapes/buttons';
import { Toolbar } from './components/toolbar';
import { TOOLTIP_ID } from './components/use-tooltip';

/** Captures nothing, so a module-level constant keeps a stable identity. */
const cellVisibility: CellVisibility = ({ model }) => isCellVisible(model);

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

/** Every element renders through `<ElementContent>`, every link through `<LinkContent>`. */
const renderElement = (): ReactNode => <ElementContent />;
const renderLink = (): ReactNode => <LinkContent />;

/** The hint over the paper while a move is on: what moves, and what to do. */
function MoveHint(): ReactNode {
    const { moved, movedScope, data } = useEditor();
    if (!moved) return null;
    return (
        <div className="move-hint">
            <div>Moving <strong>{describeMoved(data, getId(moved))}</strong>{movedScope === 'branch' ? ' and everything below it' : ' without what follows it'}</div>
            <div className="move-hint-how">
                Click a{' '}
                {/* The drop point itself, small, in the sentence. */}
                <svg className="move-hint-button" viewBox="-9 -9 18 18" aria-label="plus"><rect x={-9} y={-9} width={18} height={18} rx={3} ry={3} /><path d={PLUS_PATH} /></svg>
                {' '}button where it should go. <kbd>Esc</kbd> or a click on the blank area cancels.
            </div>
        </div>
    );
}

/** The one menu of the app, when one is open (see `menu.tsx`). */
function MenuLayer(): ReactNode {
    const { menu, closeMenu } = useEditor();
    return menu ? <Menu request={menu} onClose={closeMenu} /> : null;
}

/** The classes on the app: while a move is on, the hint shows and the "more" buttons hide; while something is selected, a small screen shows the panel (see `index.css`). */
function Stage({ children }: { children: ReactNode }): ReactNode {
    const { moved } = useEditor();
    const { collection } = useSelectionCollection();
    const hasSelection = useCells(collection, (cells) => cells.length > 0);
    return (
        <div className={`app${moved ? ' moving-mode' : ''}${hasSelection ? ' has-selection' : ''}`}>
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
                                    id={PAPER_ID}
                                    className="paper"
                                    renderElement={renderElement}
                                    renderLink={renderLink}
                                    cellVisibility={cellVisibility}
                                    interactive={false}
                                    overflow
                                    drawGrid={false}
                                    background={{ color: COLORS.background }}
                                >
                                    <PaperInteractions />
                                    <DiagramSelection />
                                </Paper>
                            </PaperScroller>
                            <MoveHint />
                            <Minimap />
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
