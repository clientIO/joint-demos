import { fromBPMN } from '@joint/format-bpmn-import';
import { bpmnImportOptions } from '../shapes/factories';
import { importBPMN } from '../utils';
import { ZOOM_SETTINGS } from '../configs/paper-config';

import type { ui } from '@joint/plus';
import type { dia } from '@joint/plus';

/**
 * Replaces the diagram with the file's content (BPMN XML or JSON), resets
 * the undo history (undoing into the previous diagram makes no sense) and
 * fits the diagram into the viewport. Unsupported or invalid files are
 * reported and skipped.
 */
export async function importFile(paperScroller: ui.PaperScroller, commandManager: dia.CommandManager, file: File): Promise<void> {

    const graph = paperScroller.options.paper.model;

    switch (file.name.split('.').pop()?.toLowerCase()) {
        case 'json': {
            graph.fromJSON(JSON.parse(await file.text()));
            break;
        }
        case 'xml':
        case 'bpmn': {
            const xml = new DOMParser().parseFromString(await file.text(), 'application/xml');
            const { cells, errors } = fromBPMN(xml, bpmnImportOptions);

            if (errors.length > 0) {
                console.warn(errors);
                return;
            }

            importBPMN(graph, cells);
            break;
        }
        default: {
            console.warn('Unsupported file type:', file.name);
            return;
        }
    }

    commandManager.reset();

    // Fit the new diagram into the viewport (up to 100% zoom). Mirrors the
    // react `zoomToFit` helper, which is not available outside components.
    const contentArea = graph.getBBox();
    if (contentArea) {
        paperScroller.zoomToRect(contentArea.inflate(60), {
            minScale: ZOOM_SETTINGS.min,
            maxScale: 1,
            verticalAlign: 'middle',
            horizontalAlign: 'middle'
        });
    }
}

/**
 * Imports a file dropped onto the paper, showing the drop overlay while a
 * file is dragged over. Returns a cleanup function.
 */
export function setupFileImport(paperScroller: ui.PaperScroller, commandManager: dia.CommandManager, overlayEl: HTMLElement): () => void {
    const controller = new AbortController();
    const { signal } = controller;

    function dropHandler(evt: DragEvent) {
        overlayEl.classList.remove('active');
        paperScroller.unlock();
        // Prevent default behavior (Prevent file from being opened)
        evt.preventDefault();

        let file: File | undefined;
        if (evt.dataTransfer?.items) {
            // Use DataTransferItemList interface to access the file(s)
            const item = Array.from(evt.dataTransfer.items).find((item) => item.kind === 'file');
            if (item) {
                file = item.getAsFile() ?? undefined;
            }
        } else if (evt.dataTransfer?.files.length) {
            // Use DataTransfer interface to access the file(s)
            file = evt.dataTransfer.files[0];
        }

        if (!file) return;

        importFile(paperScroller, commandManager, file);
    }

    function dragOverHandler(evt: DragEvent) {
        overlayEl.classList.add('active');
        // Prevent default behavior (Prevent file from being opened)
        evt.preventDefault();
        paperScroller.lock();
    }

    function dragLeaveHandler() {
        overlayEl.classList.remove('active');
        paperScroller.unlock();
    }

    // Add event listeners with the AbortSignal
    paperScroller.el.addEventListener('drop', dropHandler, { signal });
    paperScroller.el.addEventListener('dragover', dragOverHandler, { signal });
    paperScroller.el.addEventListener('dragleave', dragLeaveHandler, { signal });

    // Return a cleanup function that aborts the controller
    return () => controller.abort();
}
