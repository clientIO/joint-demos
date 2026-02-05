
/**
 * Enables file drop on the given HTML element.
 * @todo we can add support for disabling/enabling the feature later if needed.
 */
export function enableFileDrop(paper, options = {}) {
    const { dropTarget: dropTargetEl = paper.el, format = 'text', } = options;
    
    dropTargetEl.addEventListener('drop', (evt) => {
        evt.preventDefault();
        
        // Always remove the drop-zone class to ensure the viewport is visible after the drop event is triggered
        dropTargetEl.classList.remove('drop-zone');
        
        const file = (evt.dataTransfer?.files).item(0);
        if (!file)
            return;
        
        const reader = new FileReader();
        reader.onload = () => {
            let file = reader.result;
            if (format === 'json') {
                try {
                    file = JSON.parse(file);
                }
                catch (error) {
                    paper.trigger('file:drop:invalid', error, file, evt);
                    return;
                }
            }
            paper.trigger('file:drop', file, evt);
        };
        
        reader.readAsText(file);
    });
    
    dropTargetEl.addEventListener('dragover', (evt) => {
        evt.preventDefault();
        dropTargetEl.classList.add('drop-zone');
    });
    
    dropTargetEl.addEventListener('dragleave', (evt) => {
        evt.preventDefault();
        dropTargetEl.classList.remove('drop-zone');
    });
}
