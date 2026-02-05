import { ui } from '@joint/plus';
import { getToolbarConfig } from './toolbar-config';
import { getFileFromGraph, resetGraphFromFile } from '../file/file';
import { App } from '../app';
export class ToolbarService {
    
    constructor(element, cmd, graph) {
        this.element = element;
        this.cmd = cmd;
        this.graph = graph;
        const { tools, groups } = getToolbarConfig();
        
        this.toolbar = new ui.Toolbar({
            groups: groups,
            el: element,
            tools: tools,
            autoToggle: true,
            references: { commandManager: cmd }
        });
        
        this.fileTools = [
            {
                action: 'new',
                content: 'New file'
            },
            {
                action: 'load',
                content: 'Load file'
            },
            {
                action: 'save',
                content: 'Save file'
            }
        ];
        
        this.toolbar.on('file:pointerclick', (_evt) => {
            const contextToolbar = new ui.ContextToolbar({
                target: this.toolbar.getWidgetByName('file').el,
                root: this.toolbar.el,
                padding: 0,
                vertical: true,
                position: 'bottom-left',
                anchor: 'top-left',
                tools: this.fileTools
            });
            
            contextToolbar.on('action:load', () => {
                contextToolbar.remove();
                
                const fileInput = document.createElement('input');
                fileInput.setAttribute('type', 'file');
                fileInput.setAttribute('accept', '.imp');
                
                fileInput.click();
                
                fileInput.onchange = () => {
                    const file = fileInput.files[0];
                    const reader = new FileReader();
                    
                    reader.onload = (evt) => {
                        let str = evt.target.result;
                        App.processor.reset();
                        resetGraphFromFile(graph, JSON.parse(str));
                        
                        this.cmd.reset();
                    };
                    
                    reader.readAsText(file);
                };
            });
            
            contextToolbar.on('action:save', () => {
                contextToolbar.remove();
                const str = JSON.stringify(getFileFromGraph(graph));
                const bytes = new TextEncoder().encode(str);
                const blob = new Blob([bytes], { type: 'application/json' });
                const el = window.document.createElement('a');
                el.href = window.URL.createObjectURL(blob);
                el.download = 'workflow.imp';
                document.body.appendChild(el);
                el.click();
                document.body.removeChild(el);
            });
            
            contextToolbar.on('action:new', () => {
                contextToolbar.remove();
                graph.resetCells([]);
                App.processor.reset();
                this.cmd.reset();
            });
            
            contextToolbar.render();
        });
        
        this.toolbar.render();
    }
}
