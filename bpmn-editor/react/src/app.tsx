import { useMemo, useState } from 'react';
import {
    Diagram,
    Paper,
    PaperScroller,
    Snaplines,
    Stencil,
    type StencilApi,
} from '@joint/react-plus';
import { shapes } from '@joint/plus';
import { graph } from './editor/core';
import {
    HIGHLIGHTING,
    PAPER_NATIVE_OPTIONS,
    bpmnInteractivity,
} from './editor/paper-options';
import { cellNamespace } from './shapes';
import { IntermediateBoundary } from './shapes/event/event-shapes';
import { ZOOM_SETTINGS } from './configs/navigator-config';
import { EditorBootstrap } from './components/editor-bootstrap';
import { BpmnHalo } from './components/bpmn-halo';
import { BpmnSelection } from './components/bpmn-selection';
import { LinkContextMenu } from './components/link-context-menu';
import { TipProvider } from './components/ui/tip';
import { BpmnToolbar } from './components/toolbar/bpmn-toolbar';
import { BpmnPalette } from './components/stencil/bpmn-palette';
import { InspectorPanel } from './components/inspector/inspector-panel';
import { NavigatorPanel } from './components/navigator/navigator-panel';
import { FileImportOverlay } from './components/file-import-overlay';

import type { dia } from '@joint/plus';
import type {
    ContextMenuLike,
    ContextMenuState,
} from './editor/context-menu-bridge';

// Do not snap pools, swimlanes and boundary events
function bpmnCanSnap({ model }: { model: dia.Element }) {
    return (
        !shapes.bpmn2.Swimlane.isSwimlane(model) &&
        !shapes.bpmn2.CompositePool.isPool(model) &&
        !(model instanceof IntermediateBoundary)
    );
}

export function App() {
    // Held in state (set via callback refs) so EditorBootstrap re-runs its
    // setup effect once these instances become available.
    const [stencil, setStencil] = useState<StencilApi['stencil'] | null>(null);
    const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null);

    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
        null,
    );

    // The context-menu bridge the controllers call into; forwards to React
    // state that drives <LinkContextMenu>.
    const contextMenuBridge = useMemo<ContextMenuLike>(
        () => ({
            open: (state) => setContextMenu(state),
            close: () => setContextMenu(null),
        }),
        [],
    );

    return (
        <TipProvider>
            <Diagram graph={graph} interactions={false} history>
                <div id='app'>
                    <div className='app-toolbar'>
                        <BpmnToolbar />
                    </div>
                    <div className='app-body'>
                        <Stencil ref={setStencil} className='stencil-container'>
                            <BpmnPalette />
                        </Stencil>
                        <div className='paper-container'>
                            <PaperScroller
                                style={{ width: '100%', height: '100%' }}
                                cursor='grab'
                                minZoom={ZOOM_SETTINGS.min}
                                maxZoom={ZOOM_SETTINGS.max}
                            >
                                <Paper
                                    gridSize={10}
                                    snapLinks
                                    embeddingMode
                                    markAvailable
                                    clickThreshold={10}
                                    labelsLayer
                                    interactive={bpmnInteractivity}
                                    highlighting={HIGHLIGHTING}
                                    cellViewNamespace={cellNamespace}
                                    options={PAPER_NATIVE_OPTIONS}
                                >
                                    <Snaplines canSnap={bpmnCanSnap} />
                                    <BpmnSelection />
                                    <BpmnHalo />
                                    <LinkContextMenu
                                        menu={contextMenu}
                                        onClose={() => setContextMenu(null)}
                                    />
                                    <EditorBootstrap
                                        stencil={stencil}
                                        overlayEl={overlayEl}
                                        contextMenuBridge={contextMenuBridge}
                                    />
                                </Paper>
                            </PaperScroller>
                            <NavigatorPanel />
                            <FileImportOverlay ref={setOverlayEl} />
                        </div>
                        <InspectorPanel />
                    </div>
                </div>
            </Diagram>
        </TipProvider>
    );
}
