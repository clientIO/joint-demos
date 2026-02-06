/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import type JointPlusService from '../services/joint-plus.service';
import { mvc } from '@joint/plus';

export enum SharedEvents {
    JSON_EDITOR_CHANGED = 'json-editor-changed',
    SELECTION_CHANGED = 'selection-changed',
    GRAPH_CHANGED = 'graph-changed',
    GRAPH_START_BATCH = 'graph-start-batch',
    GRAPH_STOP_BATCH = 'graph-stop-batch',
}

type ControllerCallback = (service: JointPlusService, ...args: any[]) => void;

interface ControllerEventMap {
    [eventName: string]: ControllerCallback;
}

export abstract class Controller {

    constructor(public readonly service: JointPlusService) {
        this.startListening();
    }

    abstract startListening(): void;

    stopListening(): void {
        mvc.Events.stopListening.call(this);
    }

    protected listenTo(object: any, events: ControllerEventMap): void {
        Object.keys(events).forEach(event => {
            const callback = events[event];
            if (typeof callback !== 'function') return;
            // Invoke the callback with the service argument passed first
            mvc.Events.listenTo.call(this, object, event, callback.bind(null, this.service));
        });
    }
}
