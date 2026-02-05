/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import type { dia } from '@joint/plus';

import type JointPlusService from '../../services/joint-plus.service';
import { Controller } from '../controller';
import * as actions from '../actions';

export class KeyboardController extends Controller {

    startListening() {

        const { keyboard } = this.service;

        this.listenTo(keyboard, {
            'escape': onEscape,
            'delete backspace': onDelete,
            'ctrl+0': onCtrlZero,
            'ctrl+plus': onCtrlPlus,
            'ctrl+minus': onCtrlMinus,
            'ctrl+z': onCtrlZ,
            'ctrl+y': onCtrlY,
            'ctrl+e': onCtrlE,
        });
    }
}

function onEscape(service: JointPlusService): void {
    actions.setSelection(service, []);
}

function onDelete(service: JointPlusService): void {
    actions.removeSelection(service);
}

function onCtrlPlus(service: JointPlusService,  evt: dia.Event): void {
    evt.preventDefault();
    actions.zoomIn(service);
}

function onCtrlMinus(service: JointPlusService, evt: dia.Event): void {
    evt.preventDefault();
    actions.zoomOut(service);
}

function onCtrlZero(service: JointPlusService): void {
    actions.zoomToFit(service);
}

function onCtrlZ(service: JointPlusService): void {
    actions.undoAction(service);
}

function onCtrlY(service: JointPlusService): void {
    actions.redoAction(service);
}

function onCtrlE(service: JointPlusService): void {
    actions.exportToPNG(service);
}
