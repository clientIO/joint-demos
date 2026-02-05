/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import type { dia } from '@joint/plus';
import { ui, shapes, format } from '@joint/plus';

import type JointPlusService from '../services/joint-plus.service';
import { SharedEvents } from './controller';
import { addCellTools } from './tools';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../theme';
import { stencilConfig } from './config/stencil.config';
import { ShapeTypesEnum } from './shapes/app.shapes';
import { PADDING_L } from '../theme';

// Selection

export function setSelection(service: JointPlusService, selection: dia.Cell[]): void {
    const { paper, selection: previousSelection, eventBusService } = service;
    paper.removeTools();
    previousSelection.forEach(cell => {
        const cellView = cell.findView(paper);
        if (cellView) {
            cellView.vel.removeClass('selected');
        }
    });
    service.selection = selection;
    selection.forEach(cell => {
        const cellView = cell.findView(paper);
        if (cellView) {
            cellView.vel.addClass('selected');
            addCellTools(cellView);
        }
    });
    eventBusService.emit(SharedEvents.SELECTION_CHANGED, selection);
}

export function removeSelection(service: JointPlusService) {
    const { selection, graph } = service;
    if (selection.length === 0) return;
    graph.removeCells(selection);
}

// Zooming

export function zoomToFit(service: JointPlusService) {
    const { scroller } = service;
    scroller.zoomToFit({
        minScale: ZOOM_MIN,
        maxScale: ZOOM_MAX,
        scaleGrid: ZOOM_STEP,
        useModelGeometry: true,
        padding: PADDING_L
    });
}

export function zoomIn(service: JointPlusService) {
    const { scroller } = service;
    scroller.zoom(ZOOM_STEP, {
        min: ZOOM_MIN,
        max: ZOOM_MAX,
    });
}

export function zoomOut(service: JointPlusService) {
    const { scroller } = service;
    scroller.zoom(-ZOOM_STEP, {
        min: ZOOM_MIN,
        max: ZOOM_MAX,
    });
}

// Import / Export

export function exportToPNG(service: JointPlusService): void {
    const { paper } = service;
    paper.hideTools();
    // Dump all views that are not in the viewport
    paper.dumpViews();
    format.toPNG(paper, (dataURL: string): void => {
        paper.showTools();
        openImageDownloadDialog(service, dataURL);
    }, {
        padding: 10,
        useComputedStyles: false
    });
}

export function openImageDownloadDialog(service: JointPlusService, dataURL: string, fileName: string = 'Joint'): void {
    const { keyboard, controllers } = service;
    const { keyboard: keyboardCtrl } = controllers;
    keyboardCtrl.stopListening();
    const lightbox = new ui.Lightbox({
        image: dataURL,
        downloadable: true,
        fileName
    });
    lightbox.on('action:close', () => {
        keyboardCtrl.startListening();
    });
    lightbox.listenTo(keyboard, 'escape', () => {
        keyboardCtrl.startListening();
        lightbox.close();
    });
    lightbox.open();
}

export function importGraphFromJSON(service: JointPlusService, json: any): void {
    setSelection(service, []);
    const { graph, history } = service;
    const shapeTypes = Object.values(ShapeTypesEnum);
    history.reset();
    try {
        if (json.cells.some((cell: any) => !shapeTypes.includes(cell.type))) {
            throw new Error('Invalid JSON: Unknown Cell Type');
        }
        graph.fromJSON(json);
    } catch {
        // Invalid JSON format
    }
}

// Stencil

export function loadStencilShapes(service: JointPlusService): void {
    const { stencil } = service;
    // @ts-ignore
    const stencilShapes = stencilConfig.shapes.map(shape => new shapes.stencil[shape.name](shape));
    stencil.load(stencilShapes);
}

// Paper

export function updateLinksRouting(service: JointPlusService): void {
    const { paper, graph } = service;
    graph.getLinks().forEach(link => {
        const linkView = link.findView(paper) as dia.LinkView;
        if (linkView) {
            linkView.requestConnectionUpdate();
        }
    });
}

// History

export function undoAction(service: JointPlusService) {
    const { history } = service;
    history.undo();
}

export function redoAction(service: JointPlusService) {
    const { history } = service;
    history.redo();
}
