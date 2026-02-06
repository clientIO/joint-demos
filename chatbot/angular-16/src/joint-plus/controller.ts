/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import { mvc } from '@joint/plus';
import type JointPlusService from '../services/joint-plus.service';

export enum SharedEvents {
    JSON_EDITOR_CHANGED = 'json-editor-changed',
    SELECTION_CHANGED = 'selection-changed',
    GRAPH_CHANGED = 'graph-changed',
    GRAPH_START_BATCH = 'graph-start-batch',
    GRAPH_STOP_BATCH = 'graph-stop-batch',
}

export abstract class Controller extends mvc.Listener<[JointPlusService]> {

    constructor(public readonly service: JointPlusService) {
        super(service);
        this.startListening();
    }

    abstract startListening(): void;
}
