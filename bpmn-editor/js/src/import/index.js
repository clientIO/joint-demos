import { fromBPMN } from '@joint/format-bpmn-import';
import { bpmnImportOptions } from '../shapes/factories';
import { importBPMN } from '../utils';

export class XMLFileImporter {
    paperScroller;
    commandManager;
    constructor(paperScroller, commandManager) {
        this.paperScroller = paperScroller;
        this.commandManager = commandManager;
    }
    
    canHandle(file) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        return extension === 'xml' || extension === 'bpmn';
    }
    
    async import(file, _graph) {
        const xmlString = await file.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlString, 'application/xml');
        
        const { cells, errors } = fromBPMN(xml, bpmnImportOptions);
        
        if (errors.length > 0) {
            console.error(errors);
            return;
        }
        
        // Use the utility function to import the graph with proper cell handling
        importBPMN(this.paperScroller, this.commandManager, cells);
    }
}

export class JSONFileImporter {
    paperScroller;
    constructor(paperScroller) {
        this.paperScroller = paperScroller;
    }
    
    canHandle(file) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        return extension === 'json';
    }
    
    async import(file, graph) {
        const jsonString = await file.text();
        
        // Import from JSON
        graph.fromJSON(JSON.parse(jsonString));
        
        // Center content if paper scroller is available
        this.paperScroller.centerContent({ useModelGeometry: true });
    }
}

class CompositeFileImporter {
    importers = [];
    
    constructor(paperScroller, commandManager) {
        this.importers.push(new XMLFileImporter(paperScroller, commandManager));
        this.importers.push(new JSONFileImporter(paperScroller));
    }
    
    canHandle(file) {
        return this.importers.some(importer => importer.canHandle(file));
    }
    
    async import(file, graph) {
        const importer = this.importers.find(importer => importer.canHandle(file));
        if (importer) {
            await importer.import(file, graph);
        }
        else {
            console.error('No importer found for file:', file.name);
        }
    }
}

export function setupFileImport(paperScroller, commandManager) {
    const fileImporter = new CompositeFileImporter(paperScroller, commandManager);
    const controller = new AbortController();
    const overlayEl = paperScroller.el.parentElement?.querySelector('.file-import-overlay');
    const { signal } = controller;
    
    function dropHandler(evt) {
        overlayEl.classList.remove('active');
        paperScroller.unlock();
        // Prevent default behavior (Prevent file from being opened)
        evt.preventDefault();
        
        let file;
        if (evt.dataTransfer?.items) {
            // Use DataTransferItemList interface to access the file(s)
            const item = Array.from(evt.dataTransfer.items).find((item) => item.kind === 'file');
            if (item) {
                file = item.getAsFile() ?? undefined;
            }
        }
        else if (evt.dataTransfer?.files.length) {
            // Use DataTransfer interface to access the file(s)
            file = evt.dataTransfer.files[0];
        }
        
        if (!file)
            return;
        
        if (fileImporter.canHandle(file)) {
            fileImporter.import(file, paperScroller.options.paper.model);
        }
        else {
            console.error('Unsupported file type:', file.name);
        }
    }
    
    function dragOverHandler(evt) {
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
