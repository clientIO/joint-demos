var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { fromBPMN } from '@joint/format-bpmn-import';
import { bpmnImportOptions } from '../shapes/factories';
import { importBPMN } from '../utils';

export class XMLFileImporter {
    constructor(paperScroller, commandManager) {
        this.paperScroller = paperScroller;
        this.commandManager = commandManager;
    }
    
    canHandle(file) {
        var _a;
        const extension = (_a = file.name.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        return extension === 'xml' || extension === 'bpmn';
    }
    
    import(file, _graph) {
        return __awaiter(this, void 0, void 0, function* () {
            const xmlString = yield file.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlString, 'application/xml');
            
            const { cells, errors } = fromBPMN(xml, bpmnImportOptions);
            
            if (errors.length > 0) {
                console.error(errors);
                return;
            }
            
            // Use the utility function to import the graph with proper cell handling
            importBPMN(this.paperScroller, this.commandManager, cells);
        });
    }
}

export class JSONFileImporter {
    constructor(paperScroller) {
        this.paperScroller = paperScroller;
    }
    
    canHandle(file) {
        var _a;
        const extension = (_a = file.name.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        return extension === 'json';
    }
    
    import(file, graph) {
        return __awaiter(this, void 0, void 0, function* () {
            const jsonString = yield file.text();
            
            // Import from JSON
            graph.fromJSON(JSON.parse(jsonString));
            
            // Center content if paper scroller is available
            this.paperScroller.centerContent({ useModelGeometry: true });
        });
    }
}

class CompositeFileImporter {
    
    constructor(paperScroller, commandManager) {
        this.importers = [];
        this.importers.push(new XMLFileImporter(paperScroller, commandManager));
        this.importers.push(new JSONFileImporter(paperScroller));
    }
    
    canHandle(file) {
        return this.importers.some(importer => importer.canHandle(file));
    }
    
    import(file, graph) {
        return __awaiter(this, void 0, void 0, function* () {
            const importer = this.importers.find(importer => importer.canHandle(file));
            if (importer) {
                yield importer.import(file, graph);
            }
            else {
                console.error('No importer found for file:', file.name);
            }
        });
    }
}

export function setupFileImport(paperScroller, commandManager) {
    var _a;
    const fileImporter = new CompositeFileImporter(paperScroller, commandManager);
    const controller = new AbortController();
    const overlayEl = (_a = paperScroller.el.parentElement) === null || _a === void 0 ? void 0 : _a.querySelector('.file-import-overlay');
    const { signal } = controller;
    
    function dropHandler(evt) {
        var _a, _b, _c;
        overlayEl.classList.remove('active');
        paperScroller.unlock();
        // Prevent default behavior (Prevent file from being opened)
        evt.preventDefault();
        
        let file;
        if ((_a = evt.dataTransfer) === null || _a === void 0 ? void 0 : _a.items) {
            // Use DataTransferItemList interface to access the file(s)
            const item = Array.from(evt.dataTransfer.items).find((item) => item.kind === 'file');
            if (item) {
                file = (_b = item.getAsFile()) !== null && _b !== void 0 ? _b : undefined;
            }
        }
        else if ((_c = evt.dataTransfer) === null || _c === void 0 ? void 0 : _c.files.length) {
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
