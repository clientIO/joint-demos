import { dia, ui, shapes, highlighters, layout } from '@joint/plus';
import { previewAttrs, stencilShapes } from './config';
import { artificialIntelligenceTimeline } from './data';
import { getPath, makeLink, removeElement, layoutDiagram } from './utils';
import { Category, Event } from './shapes';
import { setupNavigator } from './navigator';

export const init = () => {
    
    // Populate Graph
    // --------------
    
    const graph = new dia.Graph({}, { cellNamespace: shapes });
    const cells = artificialIntelligenceTimeline.toGraphShapes();
    graph.resetCells(cells);
    
    // Create Paper and Stencil
    // ------------------------
    
    const paper = new dia.Paper({
        cellViewNamespace: shapes,
        model: graph,
        interactive: false,
        async: true,
        frozen: true,
        sorting: dia.Paper.sorting.APPROX,
        background: { color: '#F7F7F7' },
        defaultAnchor: { name: 'perpendicular' },
        defaultConnectionPoint: { name: 'boundary' },
        clickThreshold: 5,
        defaultLink: function () {
            return makeLink();
        },
    });
    
    const paperScroller = new ui.PaperScroller({
        paper,
        padding: 0,
        baseWidth: 1,
        baseHeight: 1,
        borderless: true,
        contentOptions: {
            useModelGeometry: true,
            padding: {
                left: 150,
                right: 150,
                top: 10,
                bottom: 10
            }
        },
        inertia: true,
        scrollWhileDragging: true,
        // `autoResizePaper` is required in order for the stencil to receive the correct `validDropTarget` in event handlers
        autoResizePaper: true,
        cursor: 'grab'
    });
    
    document.getElementById('paper-container').appendChild(paperScroller.render().el);
    
    const stencil = new ui.Stencil({
        el: document.getElementById('stencil'),
        paper: paperScroller,
        scaleClones: true,
        cellCursor: 'grab',
        height: 54,
        width: 198,
        dragStartClone: (element) => {
            const size = element.defaults().size;
            let clone = element.clone();
            clone.resize(size.width, size.height);
            if (element.get('dropType') === 'timeline.Category') {
                clone = Category.create(element.id, 'Important Event', 'T');
            }
            else if (element.get('dropType') === 'timeline.Event') {
                const date = new Date();
                const day = date.getDate();
                const month = date.toLocaleString('en-US', { month: 'long' });
                clone = Event.create(element.id, `${month} ${day}`, 'Something happened', 'T');
            }
            return clone;
        },
        layout: {
            columns: 2,
            columnGap: 8,
            marginX: 8,
            marginY: 8
        }
    });
    
    stencil.on({
        'element:dragstart': (cloneView, evt) => {
            const element = cloneView.model.clone();
            evt.data.elements = [element];
        },
        'element:drag': (cloneView, evt, cloneArea, validDropTarget) => {
            const { elements, dragStarted } = evt.data;
            const { x, y } = cloneArea.center();
            if (validDropTarget) {
                if (!dragStarted) {
                    treeView.dragstart(elements, x, y);
                    evt.data.dragStarted = true;
                }
                treeView.drag(elements, x, y);
                cloneView.el.style.display = 'none';
            }
            else {
                treeView.cancelDrag();
                evt.data.dragStarted = false;
                cloneView.el.style.display = 'block';
            }
        },
        'element:dragend': (cloneView, evt, cloneArea, validDropTarget) => {
            const { elements } = evt.data;
            const { x, y } = cloneArea.center();
            const canDrop = validDropTarget && treeView.canDrop();
            const element = elements[0];
            
            treeView.dragend(elements, x, y);
            
            cloneView.el.style.display = 'block'; // enable drop animation
            stencil.cancelDrag({ dropAnimation: !canDrop });
            
            if (canDrop) {
                const layoutArea = tree.getLayoutArea(element);
                const siblingIndex = layoutArea.siblingRank;
                const path = getPath(graph, element);
                // Remove the actual element from the path
                path.pop();
                const label = element.attr('label/text') || element.attr('bodyText/text') || '';
                const date = element.attr('dateText/text') || '';
                artificialIntelligenceTimeline.addChildToPath(path, { id: element.id, label, date }, siblingIndex);
            }
        }
    });
    
    stencil.render();
    stencil.load(stencilShapes);
    
    // Create Tree Layout and View
    // ---------------------------
    
    // Custom TreeLayoutView to override updateParentPreview
    const TreeLayoutView = ui.TreeLayoutView.extend({
        updateParentPreview: function (position, size, parent) {
            
            // Use the parent's border radius
            const rx = parent.attr('body/rx') || 0;
            const ry = parent.attr('body/ry') || 0;
            
            this.svgPreviewParent.attr({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                // Use the parent's border radius
                rx,
                ry
            });
        }
    });
    
    const tree = new layout.TreeLayout({
        graph,
        gap: 20,
        parentGap: 40,
        updateVertices: () => {
            // No-op
            // We do not want to update the vertices here, because we want to work in the context of
            // the whole branch, not just the parent-child link
        },
        filter: (children, parent) => {
            if (parent) {
                return children.filter((child) => !child.get('busElement'));
            }
            return artificialIntelligenceTimeline.getBusElements().map((id) => graph.getCell(id));
        }
        
    });
    
    const treeView = new TreeLayoutView({
        paper: paper,
        model: tree,
        paperOptions: {
            // Allow overflow for the dragging paper so the drop shadow is visible
            overflow: true
        },
        previewAttrs: previewAttrs,
        fallbackToAncestor: true,
        snapToClosestElement: {
            radius: 450
        },
        useModelGeometry: true,
        validatePosition: function (_el, _x, _y) {
            // Elements have to be connected to the main tree.
            return false;
        },
        validateConnection: (element, candidate) => {
            // Only allow connections: Milestone <- Category <- Event
            return candidate.isConnectionValid(element.get('type'));
        },
        reconnectElements: ([element], parent, siblingRank, direction, treeLayoutView) => {
            selection.collection.reset([]);
            const path = getPath(graph, element);
            artificialIntelligenceTimeline.moveChildByPath(path, getPath(graph, parent), siblingRank);
            treeLayoutView.reconnectElement(element, {
                id: String(parent.id),
                direction,
                siblingRank
            });
            layoutDiagram(tree, paperScroller, selection);
            // Select the element after reconnecting it
            selection.collection.reset([element]);
        },
        canInteract: function (elementView) {
            return !elementView.model.get('busElement');
        },
        layoutFunction: (tlView) => layoutDiagram(tlView.model, paperScroller, selection)
    });
    
    const selection = new ui.Selection({
        paper,
        frames: new ui.HighlighterSelectionFrameList({
            highlighter: highlighters.mask,
            selector: 'body',
            options: {
                attrs: {
                    stroke: '#F0D394',
                    strokeWidth: 2,
                }
            }
        })
    });
    
    layoutDiagram(tree, paperScroller, selection);
    paper.unfreeze();
    
    graph.on('change:attrs', (element, attrs, { propertyPath }) => {
        if (!(element instanceof Category) || propertyPath !== 'attrs/label/text')
            return;
        element.updateSize();
        layoutDiagram(tree, paperScroller, selection);
    });
    
    paper.on('element:pointerdown', (elementView) => {
        selection.collection.reset([elementView.model]);
    });
    
    paper.on('edit', (elementView, evt) => {
        
        // Only allow double click to edit
        if (evt.originalEvent.detail !== 2)
            return;
        
        evt.stopImmediatePropagation();
        
        const element = elementView.model;
        
        const editableFields = element.getEditableFields();
        
        if (editableFields.length === 0)
            return;
        
        const data = artificialIntelligenceTimeline.getByPath(getPath(graph, element));
        
        const content = document.createElement('div');
        
        editableFields.forEach((field) => {
            const label = document.createElement('label');
            label.textContent = field.property;
            label.htmlFor = `edit-${field.property}`;
            content.appendChild(label);
            
            const input = document.createElement(field.inputType === 'textarea' ? 'textarea' : 'input');
            input.id = `edit-${field.property}`;
            input.value = data[field.property];
            input.dataset.property = field.property;
            input.dataset.attrPath = field.attrPath;
            content.appendChild(input);
        });
        
        const dialog = new ui.Dialog({
            id: 'edit-description-dialog',
            theme: 'default',
            width: 400,
            title: `Edit`,
            closeButton: false,
            content,
            buttons: [
                { action: 'save', content: 'Save' },
            ],
        });
        
        dialog.on('action:save', () => {
            const inputs = content.querySelectorAll('input, textarea');
            inputs.forEach((input) => {
                const property = input.dataset.property;
                const attrPath = input.dataset.attrPath;
                artificialIntelligenceTimeline.setValueByPath(getPath(graph, element), { [property]: input.value });
                element.attr(attrPath, input.value);
            });
            selection.collection.reset([]);
            dialog.close();
        });
        
        dialog.open();
        content.firstChild.focus();
    });
    
    paper.on('blank:pointerdown', (evt) => {
        paperScroller.startPanning(evt);
        selection.collection.reset([]);
    });
    
    const keyboard = new ui.Keyboard();
    keyboard.on('delete backspace shift+delete shift+backspace', (evt) => {
        const selected = selection.collection.toArray();
        if (selected.length === 0)
            return;
        // Do not allow deleting the last bus element
        else if (selected.some((element) => element.get('busElement')) && artificialIntelligenceTimeline.getBusElements().length === 1)
            return;
        
        selected.forEach((element) => {
            if (!element.graph)
                return;
            removeElement(tree, element, !evt.shiftKey);
        });
        
        layoutDiagram(tree, paperScroller, selection);
    });
    
    keyboard.on('escape', () => {
        selection.collection.reset([]);
    });
    
    setupNavigator(graph, paperScroller, tree);
};
