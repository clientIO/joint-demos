/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import { STORE_JOINT } from './helpers/actionTypes';
import { SharedEvents } from '../joint-plus/controller';
import { importGraphFromJSON } from '../joint-plus/actions';
import { onGraphStartBatch, onGraphStopBatch } from '../joint-plus/controllers';

import type { Middleware } from 'redux';
import type { dia } from '@joint/plus';
import type { State } from './reducer';

export const sideEffects: Middleware<object, State> = ({ getState }) => {
    return (next) => (action: { type: string, payload: unknown }) => {
        if (action.type === STORE_JOINT) {
            return next(action);
        }
        const { joint } = getState();
        if (!joint) {
            return;
        }
        switch (action.type) {
            case SharedEvents.JSON_EDITOR_CHANGED: {
                const json = action.payload as dia.Graph.JSON;
                importGraphFromJSON(joint, json);
                break;
            }
            case SharedEvents.GRAPH_START_BATCH:
                onGraphStartBatch(joint, action.payload as string);
                break;
            case SharedEvents.GRAPH_STOP_BATCH:
                onGraphStopBatch(joint, action.payload as string);
        }
        return next(action);
    };
};
