import type { dia } from '@joint/plus';

export interface FileDropOptions {
    /**
     * The HTML element that serves as the drop target.
     * Defaults to the paper's HTML element.
     */
    dropTarget?: HTMLElement;
    /**
     * How should we interpret the dropped file.
     */
    format?: 'text' | 'json';
}

/**
 * Enables file drop on the given HTML element.
 * @todo we can add support for disabling/enabling the feature later if needed.
 */
export function enableFileDrop(paper: dia.Paper, options: FileDropOptions = {}) {
    const {
        dropTarget: dropTargetEl = paper.el,
        format = 'text',
    } = options;

    dropTargetEl.addEventListener('drop', (evt: DragEvent) => {
        evt.preventDefault();

        // Always remove the drop-zone class to ensure the viewport is visible after the drop event is triggered
        dropTargetEl.classList.remove('drop-zone');

        const file = (evt.dataTransfer?.files as FileList).item(0);
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            let file: unknown = reader.result;
            if (format === 'json') {
                try {
                    file = JSON.parse(file as string);
                } catch (error) {
                    paper.trigger('file:drop:invalid', error, file, evt);
                    return;
                }
            }
            paper.trigger('file:drop', file, evt);
        };

        reader.readAsText(file);
    });

    dropTargetEl.addEventListener('dragover', (evt: DragEvent) => {
        evt.preventDefault();
        dropTargetEl.classList.add('drop-zone');
    });

    dropTargetEl.addEventListener('dragleave', (evt: DragEvent) => {
        evt.preventDefault();
        dropTargetEl.classList.remove('drop-zone');
    });
}
