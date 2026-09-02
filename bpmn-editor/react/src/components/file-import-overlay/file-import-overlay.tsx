import { useEffect, useRef } from 'react';
import { usePaperScroller, useGraphHistory } from '@joint/react-plus';
import { importFile } from '../../actions/import-actions';
import './file-import-overlay.css';

/**
 * Drop overlay shown while a file is dragged over the paper. Owns the
 * drag-and-drop file import: it attaches the drag listeners to the scroller,
 * toggles its own `active` class and hands the dropped file to `importFile`.
 */
export function FileImportOverlay() {

    const overlayRef = useRef<HTMLDivElement | null>(null);

    const { paperScroller } = usePaperScroller();
    const { commandManager } = useGraphHistory();

    useEffect(() => {
        const overlayEl = overlayRef.current;
        if (!paperScroller || !overlayEl) return;

        // One signal for all three listeners, so the cleanup is a single abort.
        const controller = new AbortController();
        const { signal } = controller;

        // The paper is locked while a file is over it: a drag that pans the
        // diagram underneath the overlay is not what the drop is for.
        const onDragOver = (evt: DragEvent) => {
            overlayEl.classList.add('active');
            // Prevent default behavior (Prevent file from being opened)
            evt.preventDefault();
            paperScroller.lock();
        };

        const onDragLeave = () => {
            overlayEl.classList.remove('active');
            paperScroller.unlock();
        };

        const onDrop = (evt: DragEvent) => {
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
        };

        const { el } = paperScroller;
        el.addEventListener('drop', onDrop, { signal });
        el.addEventListener('dragover', onDragOver, { signal });
        el.addEventListener('dragleave', onDragLeave, { signal });

        return () => controller.abort();
    }, [paperScroller, commandManager]);

    return (
        // aria-hidden: the overlay idles at opacity 0 (still in the tree) and
        // only appears during a pointer file-drag — a purely visual affordance.
        <div ref={overlayRef} className="file-import-overlay" aria-hidden="true">
            <div className="file-import-overlay-content">
                <svg
                    className="drop-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M12 3v12" />
                    <path d="m8 11 4 4 4-4" />
                    <path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" />
                </svg>
                <h2 className="headline">Drop your BPMN diagram</h2>
                <p className="subline">Supported: <code>.bpmn</code>, <code>.xml</code>, <code>.json</code></p>
            </div>
        </div>
    );
}
