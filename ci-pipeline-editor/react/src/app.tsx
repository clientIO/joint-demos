import { Diagram, Paper, PaperScroller, useCells, useSelectionCollection } from '@joint/react-plus';
import type { CellVisibility, InteractionsOptions } from '@joint/react-plus';
import type { ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';

import { EditorProvider } from './editor-provider';
import { PAPER_ID, useEditor } from './editor-context';
import { isCellVisible } from './layout';
import { Inspector } from './components/inspector';
import { Menu } from './components/menu';
import { Minimap } from './components/minimap';
import { PaperInteractions } from './components/paper-interactions';
import { DiagramSelection } from './components/selection';
import { COLORS, ElementContent, LinkContent, cellNamespace } from './shapes';
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
                            <div className="move-hint">Choose where to move it &mdash; <kbd>Esc</kbd> cancels</div>
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
