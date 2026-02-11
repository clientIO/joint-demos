import { ui } from '@joint/plus';
import { constructMarkerContent, getShapeConstructorByType } from '../utils';
import { eventBus, EventBusEvents } from '../event-bus';

const INSPECTOR_EMPTY = document.createElement('div');

export default class InspectorService {

    constructor({ inspectorEl, contentButton, appearanceButton }) {

        this.inspectorEl = inspectorEl;
        this.contentButton = contentButton;
        this.appearanceButton = appearanceButton;
        this.fieldController = new AbortController();

        // Hide the appearance button since we can't store appearance in BPMN XML
        if (this.appearanceButton) {
            this.appearanceButton.style.display = 'none';
        }

        // Init placeholder element
        const label = document.createElement('span');
        label.textContent = 'Start by selecting an element or link';
        const icon = document.createElement('div');
        icon.classList.add('inspector-empty-icon');
        INSPECTOR_EMPTY.classList.add('inspector-empty');
        INSPECTOR_EMPTY.appendChild(icon);
        INSPECTOR_EMPTY.appendChild(label);

        this.inspectorEl.replaceChildren(INSPECTOR_EMPTY);
        this.disableButtons();
        this.startListening();
    }
    
    create(shape) {
        this.currentShape = shape;
        this.fieldController = new AbortController();
        this.enableButtons();
        this.createContentView(shape);
    }
    
    createContentView(shape) {

        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('inspector-content-wrapper');

        // Create custom content inspector if the shape provides getContentConfig
        if (shape.getContentConfig) {
            const { groups, inputs } = shape.getContentConfig();

            ui.Inspector.create(this.inspectorEl, {
                cell: shape,
                container: this.inspectorEl,
                live: true,
                groups,
                inputs,
                renderLabel: (opt) => {
                    if (opt.label) return undefined;
                    return null;
                }
            });
            return;
        }

        // Create `ui.SelectButtonGroup` for markers if there are any
        if (shape.isElement() && shape.getMarkers && shape.getMarkers().length > 0) {
            
            const markers = shape.getMarkers();
            const shapeMarkers = shape.get('markers');
            
            const selectedMarkers = markers.filter(marker => shapeMarkers.includes(marker.name));
            
            const markersButtonGroup = new ui.SelectButtonGroup({
                options: markers.map(marker => ({
                    content: constructMarkerContent(marker),
                    value: marker.name
                })),
                multi: true,
                selected: selectedMarkers.map(marker => marker.index),
            });
            
            const markersLabel = document.createElement('h3');
            markersLabel.classList.add('content-label');
            markersLabel.textContent = 'Available markers';
            
            markersButtonGroup.once('option:select', (options, _, opt) => {
                if (opt.markersUpdated)
                    return;
                
                shape.setMarkers && shape.setMarkers(options.map((option) => option.value));
                this.createContentView(shape);
            });
            
            shape.on('change:markers', () => {
                markersButtonGroup.deselect();
                markersButtonGroup.selectByValue(shape.get('markers'), { markersUpdated: true });
            });
            
            contentWrapper.appendChild(markersLabel);
            contentWrapper.appendChild(markersButtonGroup.render().el);
            
            this.markerButtonGroup = markersButtonGroup;
        }
        
        // Create `ui.SelectButtonGroup` for the shapes if there are any
        const shapes = shape.getShapeList();
        
        if (shapes.length > 0) {
            const availableShapes = shapes.map((shape) => {
                const shapeConstructor = getShapeConstructorByType(shape);
                const { label, icon } = shapeConstructor;
                
                const shapeWrapper = document.createElement('div');
                
                const iconEl = document.createElement('span');
                iconEl.className = icon;
                
                const labelEl = document.createElement('span');
                labelEl.textContent = label;
                
                shapeWrapper.appendChild(iconEl);
                shapeWrapper.appendChild(labelEl);
                
                return {
                    content: shapeWrapper.innerHTML,
                    value: shape
                };
            });
            
            const shapeButtonGroup = new ui.SelectButtonGroup({
                options: availableShapes
            });
            
            shapeButtonGroup.once('option:select', (option) => {
                const shapeConstructor = getShapeConstructorByType(option.value);
                const newShape = new shapeConstructor({ id: shape.id });
                
                eventBus.trigger(EventBusEvents.GRAPH_REPLACE_CELL, shape, newShape);
                this.create(newShape);
            });
            
            const shapesLabel = document.createElement('h3');
            shapesLabel.classList.add('content-label');
            shapesLabel.textContent = 'Available shapes';
            
            contentWrapper.appendChild(shapesLabel);
            contentWrapper.appendChild(shapeButtonGroup.render().el);
            
            this.shapeButtonGroup = shapeButtonGroup;
        }
        
        this.inspectorEl.replaceChildren(contentWrapper);
    }

    close() {
        var _a, _b;
        this.fieldController.abort();
        ui.Inspector.close();
        (_a = this.markerButtonGroup) === null || _a === void 0 ? void 0 : _a.remove();
        (_b = this.shapeButtonGroup) === null || _b === void 0 ? void 0 : _b.remove();
        this.inspectorEl.replaceChildren(INSPECTOR_EMPTY);
        this.disableButtons();
    }
    
    enableButtons() {
        // Content button is always active when a shape is selected
        this.contentButton.disabled = false;
        this.contentButton.classList.add('active');
    }

    disableButtons() {
        this.contentButton.disabled = true;
        this.contentButton.classList.remove('active');
    }

    startListening() {
        // No button listeners needed since we only have the Content view
    }
    
    stopListening() {
        var _a;
        (_a = this.inspectorAbortController) === null || _a === void 0 ? void 0 : _a.abort();
    }
}
