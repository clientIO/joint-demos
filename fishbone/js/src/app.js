import { dia, shapes, ui, mvc, highlighters } from '@joint/plus';
import { layoutFishbone } from './fishbone';
import { generateFishboneCells } from './shapes';
import { poorProductQualityData } from './data';

export const init = () => {
    // App setup
    
    const graph = new dia.Graph({}, { cellNamespace: shapes });
    
    const paperEl = document.getElementById('paper');
    
    if (!paperEl) {
        throw new Error('Paper element not found');
    }
    
    const paper = new dia.Paper({
        width: 3000,
        height: 3000,
        model: graph,
        cellViewNamespace: shapes,
        gridSize: 10,
        overflow: true,
        interactive: false,
        async: true,
        autoFreeze: true,
        clickThreshold: 5,
        defaultAnchor: {
            name: 'center',
            args: {
                useModelGeometry: true,
            }
        },
        defaultConnectionPoint: {
            name: 'boundary',
            args: {
                useModelGeometry: true,
            }
        },
    });
    
    const scroller = new ui.PaperScroller({
        autoResizePaper: true,
        paper,
        cursor: 'grab',
        baseWidth: 10,
        baseHeight: 10,
    });
    
    scroller.el.style.width = '100%';
    scroller.el.style.height = '100%';
    
    paperEl.appendChild(scroller.render().el);
    
    paper.on('blank:pointerdown', (evt) => scroller.startPanning(evt));
    
    paper.on('paper:pinch', (evt, ox, oy, scale) => {
        evt.preventDefault();
        scroller.zoom(scale - 1, { min: 0.2, max: 5, ox, oy });
    });
    
    paper.on('paper:pan', (evt, tx, ty) => {
        evt.preventDefault();
        scroller.el.scrollLeft += tx;
        scroller.el.scrollTop += ty;
    });
    
    const fishboneModel = new mvc.Model();
    
    const commandManager = new dia.CommandManager({
        model: fishboneModel,
        // Register only the changes to the data attribute
        cmdNameRegex: /^change:data/,
    });
    
    const toolbar = new ui.Toolbar({
        tools: [{
                type: 'undo',
                text: 'Undo'
            }, {
                type: 'redo',
                text: 'Redo'
            }, {
                type: 'separator',
            }, {
                type: 'zoom-in',
                text: 'Zoom In'
            }, {
                type: 'zoom-out',
                text: 'Zoom Out'
            }, {
                type: 'zoom-to-fit',
                text: 'Zoom To Fit'
            }, {
                type: 'separator',
            }, {
                type: 'label',
                text: 'hsGap',
            }, {
                type: 'range',
                name: 'hsGap',
                value: 4
            }, {
                type: 'label',
                text: 'vsGap',
            }, {
                type: 'range',
                name: 'vsGap',
                value: 10
            }, {
                type: 'label',
                text: 'hcGap',
            }, {
                type: 'range',
                name: 'hcGap',
                value: 5
            }, {
                type: 'label',
                text: 'vcGap',
            }, {
                type: 'range',
                name: 'vcGap',
                value: 15
            }],
        autoToggle: true,
        references: {
            paperScroller: scroller,
            commandManager
        }
    });
    
    toolbar.render();
    document.getElementById('toolbar')?.appendChild(toolbar.el);
    
    const runLayout = function () {
        const getRangeValue = (widget) => {
            return widget.getValue();
        };
        const vsGap = getRangeValue(toolbar.getWidgetByName('vsGap'));
        const vcGap = getRangeValue(toolbar.getWidgetByName('vcGap'));
        const hsGap = getRangeValue(toolbar.getWidgetByName('hsGap'));
        const hcGap = getRangeValue(toolbar.getWidgetByName('hcGap'));
        layoutFishbone(graph, 0, 0, { vsGap, vcGap, hsGap, hcGap });
    };
    
    fishboneModel.on('change:data', (_model, data) => {
        graph.syncCells(generateFishboneCells(data), { remove: true });
        selectNode(paper, fishboneModel.get('selection'));
        runLayout();
    });
    
    // The current selection is stored in the model
    fishboneModel.on('change:selection', (_model, selection) => {
        selectNode(paper, selection);
    });
    
    function selectNode(paper, selection) {
        highlighters.addClass.removeAll(paper);
        highlighters.mask.removeAll(paper);
        if (selection) {
            const el = paper.model.getCell(selection);
            if (el) {
                
                const view = paper.findViewByModel(el);
                
                highlighters.addClass.add(view, 'root', 'selected', {
                    className: 'selected'
                });
                
                const level = el.get('level');
                const maskHighlighterSelector = el.attr('root/highlighterSelector');
                
                if (level > 3) {
                    highlighters.mask.add(view, maskHighlighterSelector, 'selected-outline', {
                        padding: 1,
                        attrs: {
                            stroke: '#1B8BBB',
                            strokeWidth: 2,
                            rx: 2,
                            ry: 2,
                        }
                    });
                }
                else {
                    highlighters.mask.add(view, maskHighlighterSelector, 'selected-outline', {
                        padding: 2,
                        deep: true,
                        layer: 'front',
                        style: {
                            // move the mask by 2px to the left and top to mimic the transform of the selected element
                            transform: 'translate(-2px, -2px)'
                        },
                        attrs: {
                            stroke: '#1B8BBB',
                            strokeWidth: 4,
                            strokeLinejoin: 'round'
                        }
                    });
                }
            }
        }
    }
    
    fishboneModel.set('data', poorProductQualityData);
    commandManager.reset();
    scroller.adjustPaper();
    scroller.zoomToFit({
        padding: {
            left: 20,
            right: 20,
            top: 200,
        },
        useModelGeometry: true
    });
    
    toolbar.on({
        'hsGap:change': () => runLayout(),
        'vsGap:change': () => runLayout(),
        'hcGap:change': () => runLayout(),
        'vcGap:change': () => runLayout(),
    });
    
    // Inspector
    // When an element is clicked, open an inspector dialog to edit its properties
    paper.on('element:pointerclick', (elementView) => {
        
        const element = elementView.model;
        
        fishboneModel.set('selection', element.id);
        
        const level = element.get('level');
        const elementPath = ['data', ...element.get('path')].join('/');
        
        const elementInputs = {
            name: {
                type: 'content-editable',
                label: 'Name',
            },
        };
        
        if (level === 2) {
            elementInputs.direction = {
                type: 'select-button-group',
                label: 'Direction',
                defaultValue: null,
                options: [{
                        value: null,
                        content: 'Auto'
                    }, {
                        value: 'top',
                        content: 'Top'
                    }, {
                        value: 'bottom',
                        content: 'Bottom'
                    }]
            };
        }
        
        const labels = ['Problem', 'Tail', 'Cause', 'Effect', 'Sub-Cause'];
        const label = labels[Math.min(Math.max(level + 1, 2), labels.length - 1)];
        const childrenInputs = {
            type: 'list',
            label: `${label}s`,
            item: {
                type: 'object',
                properties: {
                    name: {
                        type: 'content-editable',
                        label: `Name`
                    },
                }
            }
        };
        
        const inputs = {
            [elementPath]: elementInputs,
        };
        
        if (level === 0) {
            inputs[elementPath + '/children/0/children'] = childrenInputs;
        }
        else {
            inputs[elementPath] = { ...elementInputs, children: childrenInputs };
        }
        
        const inspector = new ui.Inspector({
            cell: fishboneModel,
            inputs,
            live: false
        });
        inspector.el.id = 'inspector';
        inspector.el.style.position = 'relative';
        
        const dialog = new ui.Dialog({
            title: `${labels[Math.min(level, 4)]}`,
            draggable: true,
            content: inspector.render().el,
            width: 430,
            closeButtonContent: null
        });
        
        dialog.open();
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.classList.add('btn-cancel');
        cancelButton.dataset.action = 'cancel';
        dialog.el.querySelector('.controls')?.appendChild(cancelButton);
        
        cancelButton.addEventListener('click', () => {
            inspector.remove();
            dialog.close();
        });
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.classList.add('btn-save');
        saveButton.dataset.action = 'save';
        dialog.el.querySelector('.controls')?.appendChild(saveButton);
        
        saveButton.addEventListener('click', () => {
            inspector.updateCell();
            inspector.remove();
            dialog.close();
        });
        
        dialog.on('close', () => {
            fishboneModel.set('selection', null);
        });
        
        // Focus the name input field
        const nameInput = inspector.el.querySelector('.text');
        if (nameInput) {
            nameInput.focus();
            // select the text in the input field
            const range = document.createRange();
            range.selectNodeContents(nameInput);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    });
};
