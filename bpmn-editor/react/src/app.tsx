import {
    Diagram,
    Paper,
    PaperScroller,
} from '@joint/react-plus';
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
} from './configs/paper-config';
import { cellNamespace } from './shapes';
import { EditorBehavior } from './components/editor-behavior';
import { BpmnSnaplines } from './components/bpmn-snaplines';
import { BpmnHalo } from './components/bpmn-halo';
import { BpmnFreeTransform } from './components/bpmn-free-transform';
import { BpmnSelection } from './components/bpmn-selection';
import { LinkContextMenu } from './components/link-context-menu';
import { LinkToolsBehavior } from './components/link-tools-behavior';
import { TipProvider } from './components/ui/tip';
import { BpmnToolbar } from './components/toolbar/bpmn-toolbar';
import { BpmnStencil } from './components/stencil/bpmn-stencil';
import { InspectorPanel } from './components/inspector/inspector-panel';
import { NavigatorPanel } from './components/navigator/navigator-panel';
import { FileImportOverlay } from './components/file-import-overlay';


export function App() {
    return (
        <TipProvider>
            <Diagram cellNamespace={cellNamespace} interactions={DIAGRAM_INTERACTIONS} history>
                <div id='app'>
                    <div className='app-toolbar'>
                        <BpmnToolbar />
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
                                    background={{ color: '#FDFDFD' }}
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
                                    <BpmnSnaplines />
                                    <BpmnSelection />
                                    <BpmnHalo />
                                    <BpmnFreeTransform />
                                    <LinkContextMenu />
                                    <LinkToolsBehavior />
                                    <EditorBehavior />
                                </Paper>
                            </PaperScroller>
                            <NavigatorPanel />
                            <FileImportOverlay />
                        </div>
                        <InspectorPanel />
                    </div>
                </div>
            </Diagram>
        </TipProvider>
    );
}
