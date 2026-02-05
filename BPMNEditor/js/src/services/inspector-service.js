import { ui } from '@joint/plus';
import { constructMarkerContent, getShapeConstructorByType } from '../utils';
import { eventBus, EventBusEvents } from '../event-bus';

const INSPECTOR_EMPTY = document.createElement('div');

var InspectorView;
(function (InspectorView) {
    InspectorView["CONTENT"] = "CONTENT";
    InspectorView["APPEARANCE"] = "APPEARANCE";
})(InspectorView || (InspectorView = {}));

export default class InspectorService {
    
    currentView = InspectorView.CONTENT;
    currentShape;
    markerButtonGroup;
    shapeButtonGroup;
    
    inspectorEl;
    contentButton;
    appearanceButton;
    // Used for aborting color field event listeners
    fieldController;
    // Used for aborting the `InspectorService` event listeners
    inspectorAbortController;
    
    constructor({ inspectorEl, contentButton, appearanceButton }) {
        this.inspectorEl = inspectorEl;
        this.contentButton = contentButton;
        this.appearanceButton = appearanceButton;
        this.fieldController = new AbortController();
        
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
        this.switchView(this.currentView);
        this.fieldController = new AbortController();
        
        switch (this.currentView) {
            case InspectorView.CONTENT:
                this.createContentView(shape);
                break;
            case InspectorView.APPEARANCE:
                this.createAppearanceView(shape);
                break;
        }
    }
    
    createContentView(shape) {
        
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('inspector-content-wrapper');
        
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
    
    createAppearanceView(shape) {
        
        const { groups, inputs } = shape.getAppearanceConfig();
        
        ui.Inspector.create(this.inspectorEl, {
            cell: shape,
            container: this.inspectorEl,
            live: true,
            groups,
            inputs,
            renderLabel: (opt) => {
                // Use default label renderer
                if (opt.label)
                    return undefined;
                // Label is not provided, don't render it
                return null;
            },
            renderFieldContent: (opt, path, value, inspector) => {
                
                // Use default renderer for non-color fields
                if (opt.type !== 'color')
                    return undefined;
                
                const label = document.createElement('label');
                label.textContent = opt.label;
                const colorInput = document.createElement('input');
                colorInput.type = 'color';
                colorInput.classList.add('color');
                colorInput.dataset.type = 'color';
                colorInput.dataset.attribute = path;
                colorInput.value = value;
                
                // Keep track of the value history, so it can be passed to the `updateCell` method
                let originalValue = value;
                // Track the value sync state
                // inspector can be closed during the color input is open which would result in the `updateCell` not being called
                // that can only happen for one color input at a time
                let syncedValue = true;
                
                colorInput.addEventListener('input', () => {
                    inspector.updateCell(colorInput, path, { ignoreHistory: true });
                    syncedValue = false;
                }, { signal: this.fieldController.signal });
                
                colorInput.addEventListener('change', (event) => {
                    inspector.updateCell(colorInput, path, { originalValue, previewDone: true });
                    originalValue = event.target.value;
                    syncedValue = true;
                }, { signal: this.fieldController.signal });
                
                inspector.once('close', () => {
                    if (syncedValue)
                        return;
                    inspector.updateCell(colorInput, path, { originalValue, previewDone: true });
                });
                
                return [label, colorInput];
            }
        });
    }
    
    close() {
        this.fieldController.abort();
        ui.Inspector.close();
        this.markerButtonGroup?.remove();
        this.shapeButtonGroup?.remove();
        this.inspectorEl.replaceChildren(INSPECTOR_EMPTY);
        this.disableButtons();
    }
    
    enableButtons() {
        this.contentButton.disabled = !this.canCurrentShapeAccessContentView();
        this.appearanceButton.disabled = false;
    }
    
    disableButtons() {
        this.contentButton.disabled = true;
        this.appearanceButton.disabled = true;
        this.contentButton.classList.remove('active');
        this.appearanceButton.classList.remove('active');
    }
    
    canCurrentShapeAccessContentView() {
        const hasMarkers = this.currentShape?.isElement() && this.currentShape.getMarkers && this.currentShape.getMarkers().length > 0;
        const hasShapes = this.currentShape && this.currentShape.getShapeList().length > 0;
        
        return !!(hasMarkers || hasShapes);
    }
    
    switchView(view) {
        
        if (view === InspectorView.CONTENT) {
            
            if (this.canCurrentShapeAccessContentView()) {
                view = InspectorView.CONTENT;
            }
            else {
                view = InspectorView.APPEARANCE;
            }
        }
        else {
            view = InspectorView.APPEARANCE;
        }
        
        this.currentView = view;
        this.enableButtons();
        
        this.contentButton.classList.toggle('active', this.currentView === InspectorView.CONTENT);
        this.appearanceButton.classList.toggle('active', this.currentView === InspectorView.APPEARANCE);
    }
    
    onContentButtonClick() {
        this.switchView(InspectorView.CONTENT);
        this.close();
        this.create(this.currentShape);
    }
    
    onAppearanceButtonClick() {
        this.switchView(InspectorView.APPEARANCE);
        this.close();
        this.create(this.currentShape);
    }
    
    startListening() {
        this.inspectorAbortController = new AbortController();
        this.contentButton.addEventListener('click', () => this.onContentButtonClick(), { signal: this.inspectorAbortController.signal });
        this.appearanceButton.addEventListener('click', () => this.onAppearanceButtonClick(), { signal: this.inspectorAbortController.signal });
    }
    
    stopListening() {
        this.inspectorAbortController?.abort();
    }
}
