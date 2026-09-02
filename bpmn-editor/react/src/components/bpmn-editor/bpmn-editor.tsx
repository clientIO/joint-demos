import { useEffect } from 'react';
import {
    Diagram,
    Paper,
    PaperScroller,
    usePaperScroller,
} from '@joint/react-plus';
import '@joint/react-plus/styles.css';
import '../../css/variables.css';
import '../../css/keyframes.css';
import '../../css/fonts.css';
import '../../css/bpmn-icons.css';
import '../../css/print.css';
import './bpmn-editor.css';
import {
    HIGHLIGHTING,
    PAPER_NATIVE_OPTIONS,
    bpmnInteractivity,
    bpmnValidateConnection,
    bpmnConnectionStrategy,
    bpmnValidateEmbedding,
    DIAGRAM_INTERACTIONS,
    ZOOM_SETTINGS,
} from '../../configs/paper-config';
import { cellNamespace } from '../../shapes';
import { ViewInteractions } from '../view-interactions';
import { KeyboardShortcuts } from '../keyboard-shortcuts';
import { QuickAdd } from '../quick-add/quick-add';
import { QuickLink } from '../quick-link/quick-link';
import { EditInteractions } from '../edit-interactions';
import { ExampleDiagram } from '../example-diagram/example-diagram';
import { BpmnSelection } from '../bpmn-selection';
import { TipProvider } from '../tooltip/tooltip';
import { Toolbar } from '../toolbar/toolbar';
import { BpmnStencil } from '../bpmn-stencil/bpmn-stencil';
import { Inspector } from '../inspector/inspector';
import { Navigator } from '../navigator/navigator';
import { FileImportOverlay } from '../file-import-overlay/file-import-overlay';
import { AccessibilityCheck } from '../accessibility-check/accessibility-check';


/**
 * Makes the pan/scroll container keyboard-reachable: the scroller is a
 * scrollable region with no focusable child of its own (axe
 * `scrollable-region-focusable`), and once focusable it needs a widget
 * role (`focus-order-semantics`). The library exposes no props for this,
 * so the attributes are set on its element imperatively.
 */
function CanvasAccessibility() {
    const { paperScroller } = usePaperScroller();

    useEffect(() => {
        const el = paperScroller?.el;
        if (!el) return;
        el.tabIndex = 0;
        el.setAttribute('role', 'application');
        el.setAttribute('aria-roledescription', 'diagram canvas');
        el.setAttribute('aria-label', 'BPMN diagram canvas — scrollable');
    }, [paperScroller]);

    return null;
}

/**
 * The whole BPMN editor — embeddable, it fills its container (which must
 * have a definite size).
 */
export function BpmnEditor() {
    return (
        <TipProvider>
            <Diagram cellNamespace={cellNamespace} interactions={DIAGRAM_INTERACTIONS} history clipboard>
                <div className='bpmn-editor'>
                    <header className='app-toolbar'>
                        <Toolbar />
                    </header>
                    <div className='app-body'>
                        <BpmnStencil />
                        <main className='paper-container'>
                            <h1 className='sr-only'>BPMN Editor</h1>
                            <PaperScroller
                                style={{ width: '100%', height: '100%' }}
                                cursor='grab'
                                minZoom={ZOOM_SETTINGS.min}
                                maxZoom={ZOOM_SETTINGS.max}
                            >
                                <Paper
                                    gridSize={10}
                                    drawGrid
                                    background={{ color: 'var(--bpmn-paper-background)' }}
                                    snapLinks
                                    embeddingMode
                                    markAvailable
                                    clickThreshold={10}
                                    moveThreshold={10}
                                    labelsLayer
                                    interactive={bpmnInteractivity}
                                    highlighting={HIGHLIGHTING}
                                    validateConnection={bpmnValidateConnection}
                                    connectionStrategy={bpmnConnectionStrategy}
                                    validateEmbedding={bpmnValidateEmbedding}
                                    cellViewNamespace={cellNamespace}
                                    options={PAPER_NATIVE_OPTIONS}
                                >
                                    <BpmnSelection />
                                    <ViewInteractions />
                                    <EditInteractions />
                                    <KeyboardShortcuts />
                                    <QuickAdd />
                                    <QuickLink />
                                    <ExampleDiagram />
                                </Paper>
                            </PaperScroller>
                            <CanvasAccessibility />
                            <Navigator />
                            <AccessibilityCheck />
                            <FileImportOverlay />
                        </main>
                        <Inspector />
                    </div>
                </div>
            </Diagram>
        </TipProvider>
    );
}
