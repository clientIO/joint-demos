import {
    Diagram,
    Paper,
    PaperScroller,
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
    bpmnValidateUnembedding,
    DIAGRAM_INTERACTIONS,
    ZOOM_SETTINGS,
} from '../../configs/paper-config';
import { cellNamespace } from '../../shapes';
import { ViewInteractions } from '../view-interactions';
import { KeyboardShortcuts } from '../keyboard-shortcuts';
import { EditInteractions } from '../edit-interactions';
import { ExampleDiagram } from '../example-diagram/example-diagram';
import { BpmnSelection } from '../bpmn-selection';
import { TipProvider } from '../tooltip/tooltip';
import { Toolbar } from '../toolbar/toolbar';
import { BpmnStencil } from '../bpmn-stencil/bpmn-stencil';
import { Inspector } from '../inspector/inspector';
import { Navigator } from '../navigator/navigator';
import { FileImportOverlay } from '../file-import-overlay/file-import-overlay';


/**
 * The whole BPMN editor — embeddable, it fills its container (which must
 * have a definite size).
 */
export function BpmnEditor() {
    return (
        <TipProvider>
            <Diagram cellNamespace={cellNamespace} interactions={DIAGRAM_INTERACTIONS} history>
                <div className='bpmn-editor'>
                    <div className='app-toolbar'>
                        <Toolbar />
                    </div>
                    <div className='app-body'>
                        <BpmnStencil />
                        <div className='paper-container'>
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
                                    validateUnembedding={bpmnValidateUnembedding}
                                    cellViewNamespace={cellNamespace}
                                    options={PAPER_NATIVE_OPTIONS}
                                >
                                    <BpmnSelection />
                                    <ViewInteractions />
                                    <EditInteractions />
                                    <KeyboardShortcuts />
                                    <ExampleDiagram />
                                </Paper>
                            </PaperScroller>
                            <Navigator />
                            <FileImportOverlay />
                        </div>
                        <Inspector />
                    </div>
                </div>
            </Diagram>
        </TipProvider>
    );
}
