import { useEffect } from 'react';
import { ui } from '@joint/plus';
import { usePaper, usePaperScroller, useGraphHistory, useSelection, useSelectionCollection, type StencilApi } from '@joint/react-plus';
import { graph } from '../editor/core';
import { setupFileImport } from '../import';
import { ZOOM_SETTINGS } from '../configs/navigator-config';
import ViewController from '../controllers/view-controller';
import EditController from '../controllers/edit-controller';
import KeyboardController from '../controllers/keyboard-controller';
import StencilController from '../controllers/stencil-controller';
import LinkToolsService from '../services/link-tools-service';
import FreeTransformService from '../services/free-transform-service';
import carWashProcess from '../data/car-wash-process.json';

import type { ContextMenuLike } from '../editor/context-menu-bridge';

interface EditorBootstrapProps {
    stencil: StencilApi['stencil'] | null;
    overlayEl: HTMLDivElement | null;
    contextMenuBridge: ContextMenuLike;
}

// Renders nothing. Mounted inside `<Paper>`, it constructs the imperative
// editor pieces (keyboard, tooltip, selection, halo/free-transform/link-tools
// services, controllers) in a single effect with full teardown, so it is safe
// under StrictMode double-mounts.
export function EditorBootstrap({ stencil, overlayEl, contextMenuBridge }: EditorBootstrapProps) {

    const { paper } = usePaper();
    const { paperScroller, zoomToFit } = usePaperScroller();
    const { commandManager } = useGraphHistory();
    const { startSelectionRegion } = useSelection();
    // The selection collection is provided by <Diagram> and is stable — the
    // controllers only ever touch `selection.collection`.
    const selection = useSelectionCollection();

    useEffect(() => {
        if (!paper || !paperScroller || !stencil || !overlayEl) return;

        const keyboard = new ui.Keyboard();

        const linkToolsService = new LinkToolsService();
        const freeTransformService = new FreeTransformService();

        const viewController = new ViewController({
            paper,
            paperScroller,
            selection,
            startSelectionRegion,
            keyboard
        });

        const editController = new EditController({
            graph,
            paper,
            selection,
            contextMenu: contextMenuBridge,
            linkToolsService,
            freeTransformService,
            keyboard
        });

        const keyboardController = new KeyboardController({
            graph,
            paper,
            paperScroller,
            keyboard,
            selection,
            commandManager
        });

        const stencilController = new StencilController({
            stencil,
            paper,
            selection
        });

        viewController.startListening();
        editController.startListening();
        keyboardController.startListening();
        stencilController.startListening();

        // Setup drag and drop file import
        const cleanupFileImport = setupFileImport(paperScroller, commandManager, overlayEl);

        // Initial diagram — idempotent under StrictMode double-mount because
        // the graph lives at module scope.
        if (graph.getCells().length === 0) {
            graph.fromJSON(carWashProcess);
            commandManager.reset();
        }

        // Use the react-plus scroller API (model-geometry zoomToRect) — the
        // react PaperScroller manages the paper transform itself, so the raw
        // ui.PaperScroller.zoomToFit must not be used here. Fit again after
        // the initial async render settles.
        const fitContent = () => zoomToFit({ minScale: ZOOM_SETTINGS.min, maxScale: 1, contentMargin: 60 });
        fitContent();
        paper.once('render:done', fitContent);

        return () => {
            cleanupFileImport();
            stencilController.stopListening();
            keyboardController.stopListening();
            editController.stopListening();
            viewController.stopListening();
            contextMenuBridge.close();
            linkToolsService.remove();
            freeTransformService.close(paper);
            keyboard.disable();
        };
    }, [paper, paperScroller, zoomToFit, commandManager, startSelectionRegion, stencil, overlayEl, selection, contextMenuBridge]);

    return null;
}
