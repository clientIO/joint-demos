import { dia, ui, setTheme, shapes, util, elementTools, format } from '@joint/plus';
import { Link } from './shapes';
import { Decorator } from './highlighters';
import { SourceArrowhead, TargetArrowhead, Button } from './link-tools';
import { routerNamespace } from './routers';
import { anchorNamespace } from './anchors';
import { loadExample } from './example';

export const init = () => {
    
    setTheme('material');
    
    const toolbarHeight = 50;
    
    const canvas = document.getElementById('canvas');
    
    const graph = new dia.Graph({}, { cellNamespace: shapes });
    
    const paper = new dia.Paper({
        model: graph,
        width: 1000,
        height: 550,
        gridSize: 10,
        async: true,
        frozen: true,
        sorting: dia.Paper.sorting.APPROX,
        cellViewNamespace: shapes,
        background: { color: '#F3F7F6' },
        magnetThreshold: 'onleave',
        moveThreshold: 5,
        clickThreshold: 5,
        linkPinning: false,
        interactive: {
            linkMove: false,
            elementMove: false
        },
        markAvailable: true,
        snapLinks: { radius: 40 },
        routerNamespace: routerNamespace,
        defaultRouter: {
            name: 'mapping',
            args: { padding: 30 }
        },
        defaultConnectionPoint: { name: 'anchor' },
        anchorNamespace: anchorNamespace,
        defaultAnchor: { name: 'mapping' },
        defaultConnector: {
            name: 'jumpover',
            args: { jump: 'cubic' }
        },
        highlighting: {
            magnetAvailability: {
                name: 'addClass',
                options: {
                    className: 'record-item-available'
                }
            },
            connecting: {
                name: 'stroke',
                options: {
                    padding: 8,
                    attrs: {
                        'stroke': 'none',
                        'fill': '#7c68fc',
                        'fill-opacity': 0.2
                    }
                }
            }
        },
        defaultLink: function () {
            return new Link();
        },
        validateConnection: function (sv, sm, tv, tm, end) {
            const svModel = sv.model;
            const tvModel = tv.model;
            if (sv === tv)
                return false;
            if (svModel.isLink() || tvModel.isLink())
                return false;
            if (end === 'target') {
                const targetItemId = tv.findAttribute('item-id', tm);
                if (!tvModel.isItemInView(targetItemId))
                    return false;
                return (tvModel.getItemSide(targetItemId) !== 'right');
            }
            const sourceItemId = sv.findAttribute('item-id', sm);
            if (!svModel.isItemInView(sourceItemId))
                return false;
            return (svModel.getItemSide(sourceItemId) !== 'left');
        }
    });
    
    const scroller = new ui.PaperScroller({
        paper,
        cursor: 'grab',
        autoResizePaper: true,
        baseWidth: 1,
        baseHeight: 1,
        inertia: { friction: 0.8 },
        borderless: true
    });
    
    canvas.appendChild(scroller.el);
    scroller.render().center();
    
    // Undo / Redo
    const commandManager = new dia.CommandManager({
        graph: graph,
        cmdBeforeAdd: function (eventName) {
            if (eventName === 'change:scrollTop')
                return false;
            return true;
        }
    });
    
    const toolbar = new ui.Toolbar({
        autoToggle: true,
        tools: [
            { type: 'undo' },
            { type: 'redo' },
            { type: 'zoomToFit' },
            { type: 'button', name: 'svg', text: 'Export SVG' }
        ],
        references: {
            commandManager: commandManager,
            paperScroller: scroller
        }
    });
    
    toolbar.on('svg:pointerclick', () => {
        format.toSVG(paper, (svg) => {
            new ui.Lightbox({
                image: 'data:image/svg+xml,' + encodeURIComponent(svg),
                downloadable: true,
                fileName: 'DataMapping'
            }).open();
        }, {
            preserveDimensions: true,
            convertImagesToDataUris: true,
            useComputedStyles: false
        });
    });
    
    toolbar.render();
    toolbar.el.style.height = toolbarHeight + 'px';
    canvas.appendChild(toolbar.el);
    
    // Scrollbars
    graph.on('add', (cell) => {
        if (cell.get('type') === 'mapping.Record') {
            cell.findView(paper).addTools(new dia.ToolsView({
                tools: [new elementTools.RecordScrollbar({})]
            }));
        }
    });
    
    // Decorators
    graph.on('add change:decorators', (cell) => {
        const decorators = cell.get('decorators');
        if (!util.isPlainObject(decorators))
            return;
        const view = cell.findView(paper);
        Decorator.remove(view);
        Object.keys(decorators).forEach(itemId => {
            const text = decorators[itemId];
            if (!text || !cell.item(itemId))
                return;
            Decorator.create(view, itemId, { text });
        });
    });
    
    commandManager.stopListening();
    
    loadExample(graph);
    
    commandManager.listen();
    
    // Register events
    
    paper.on('blank:pointerdown', (evt) => scroller.startPanning(evt));
    
    paper.on('blank:mousewheel', (evt, ox, oy, delta) => {
        evt.preventDefault();
        zoom(ox, oy, delta);
    });
    
    paper.on('link:mousewheel', (_, evt, ox, oy, delta) => {
        evt.preventDefault();
        zoom(ox, oy, delta);
    });
    
    function zoom(x, y, delta) {
        scroller.zoom(delta * 0.2, { min: 0.4, max: 3, grid: 0.2, ox: x, oy: y });
    }
    
    paper.on('link:mouseenter', (linkView) => {
        showLinkTools(linkView);
    });
    
    paper.on('link:mouseleave', (linkView) => {
        linkView.removeTools();
    });
    
    
    paper.on('element:magnet:pointerdblclick', (elementView, evt, magnet) => {
        evt.stopPropagation();
        const model = elementView.model;
        itemEditAction(model, elementView.findAttribute('item-id', magnet));
    });
    
    paper.on('element:contextmenu', (elementView, evt) => {
        const model = elementView.model;
        const tools = model.getTools();
        if (tools) {
            evt.stopPropagation();
            elementActionPicker(elementView.el, elementView, tools);
        }
    });
    
    paper.on('element:magnet:contextmenu', (elementView, evt, magnet) => {
        const model = elementView.model;
        const itemId = elementView.findAttribute('item-id', magnet);
        const tools = model.getItemTools(itemId);
        if (tools) {
            evt.stopPropagation();
            itemActionPicker(magnet, elementView, elementView.findAttribute('item-id', magnet), tools);
        }
    });
    
    paper.on('element:pointerclick', (elementView) => {
        showElementTools(elementView);
    });
    
    paper.on('element:pointermove', function (view, evt, x, y) {
        const data = evt.data;
        let ghost = data.ghost;
        if (!ghost) {
            const position = view.model.position();
            ghost = view.vel.clone();
            ghost.attr('opacity', 0.3);
            ghost.appendTo(this.viewport);
            evt.data.ghost = ghost;
            evt.data.dx = x - position.x;
            evt.data.dy = y - position.y;
        }
        ghost.attr('transform', 'translate(' + [x - data.dx, y - data.dy] + ')');
    });
    
    paper.on('element:pointerup', (view, evt, x, y) => {
        const data = evt.data;
        if (data.ghost) {
            data.ghost.remove();
            view.model.position(x - data.dx, y - data.dy);
        }
    });
    
    paper.on('element:mousewheel', (recordView, evt, x, y, delta) => {
        evt.preventDefault();
        const record = recordView.model;
        if (!record.isEveryItemInView()) {
            record.setScrollTop(record.getScrollTop() + delta * 10);
        }
    });
    
    paper.on('element:decorator:pointerdown', (recordView, evt, itemId) => {
        const record = recordView.model;
        itemDecoratorEditAction(record, itemId);
    });
    
    paper.unfreeze();
    
    // Actions
    
    function showElementTools(elementView) {
        const element = elementView.model;
        const padding = util.normalizeSides(element.get('padding'));
        const isScrollable = (element.get('type') === 'mapping.Record');
        const transform = new ui.FreeTransform({
            cellView: elementView,
            allowRotation: false,
            resizeDirections: (isScrollable)
                ? ['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left']
                : ['left', 'right'],
            minWidth: function () { return element.getMinimalSize().width; },
            minHeight: (isScrollable)
                ? padding.top + padding.bottom
                : 0
        });
        transform.render();
    }
    
    function showLinkTools(linkView) {
        const tools = new dia.ToolsView({
            tools: [
                new SourceArrowhead(),
                new TargetArrowhead(),
                new Button({
                    distance: '25%',
                    action: function () {
                        linkAction(this.model);
                    }
                })
            ]
        });
        linkView.addTools(tools);
    }
    
    function itemActionPicker(target, elementView, itemId, tools) {
        
        const element = elementView.model;
        const ctxToolbar = new ui.ContextToolbar({
            target: target,
            padding: 5,
            vertical: true,
            tools: tools
        });
        
        ctxToolbar.render();
        ctxToolbar.on({
            'action:remove': function () {
                element.startBatch('item-remove');
                element.removeItem(itemId);
                element.removeInvalidLinks();
                element.stopBatch('item-remove');
                ctxToolbar.remove();
            },
            'action:edit': function () {
                ctxToolbar.remove();
                itemEditAction(element, itemId);
            },
            'action:add-child': function () {
                ctxToolbar.remove();
                element.addItemAtIndex(itemId, Infinity, element.getDefaultItem());
                if (element.isItemCollapsed(itemId))
                    element.toggleItemCollapse(itemId);
            },
            'action:add-next-sibling': function () {
                ctxToolbar.remove();
                element.addNextSibling(itemId, element.getDefaultItem());
            },
            'action:add-prev-sibling': function () {
                ctxToolbar.remove();
                element.addPrevSibling(itemId, element.getDefaultItem());
            },
            'action:edit-decorator': function () {
                ctxToolbar.remove();
                itemDecoratorEditAction(element, itemId);
            }
        });
    }
    
    function elementActionPicker(target, elementView, tools) {
        
        const element = elementView.model;
        const ctxToolbar = new ui.ContextToolbar({
            target: target.firstChild,
            padding: 5,
            vertical: true,
            tools: tools
        });
        
        ctxToolbar.render();
        ctxToolbar.on({
            'action:remove': function () {
                ctxToolbar.remove();
                element.remove();
            },
            'action:add-item': function () {
                ctxToolbar.remove();
                element.addItemAtIndex(0, Infinity, element.getDefaultItem());
            }
        });
    }
    
    function itemDecoratorEditAction(element, itemId) {
        const config = { [itemId]: { type: 'content-editable', label: 'Decorator' } };
        const path = ['decorators'];
        itemAction(element, config, path);
    }
    
    function itemEditAction(element, itemId) {
        const config = element.getInspectorConfig(itemId);
        const path = element.getItemPathArray(itemId);
        itemAction(element, config, path);
    }
    
    function itemAction(element, config, itemPath) {
        
        if (!config || !itemPath)
            return;
        
        const inspector = new ui.Inspector({
            cell: element,
            live: false,
            inputs: util.setByPath({}, itemPath, config)
        });
        
        inspector.render();
        inspector.el.style.position = 'relative';
        inspector.el.style.overflow = 'hidden';
        
        const dialog = new ui.Dialog({
            width: 300,
            title: 'Edit Item',
            closeButton: false,
            content: inspector.el,
            buttons: [{
                    content: 'Cancel',
                    action: 'cancel'
                }, {
                    content: '<span style="color:#fe854f">Change</span>',
                    action: 'change'
                }]
        });
        
        dialog.open();
        dialog.on({
            'action:cancel': function () {
                inspector.remove();
                dialog.close();
            },
            'action:change': function () {
                inspector.updateCell();
                inspector.remove();
                dialog.close();
            }
        });
        
        const input = inspector.el.querySelector('[contenteditable]');
        if (input) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(input);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    
    function linkAction(link) {
        
        const dialog = new ui.Dialog({
            title: 'Confirmation',
            width: 300,
            content: 'Are you sure you want to delete this link?',
            buttons: [
                { action: 'cancel', content: 'Cancel' },
                { action: 'remove', content: '<span style="color:#fe854f">Remove</span>' }
            ]
        });
        
        dialog.open();
        dialog.on({
            'action:remove': function () {
                link.remove();
                dialog.remove();
            },
            'action:cancel': function () {
                dialog.remove();
            }
        });
    }
};
