/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import type { ObjectDirective } from 'vue';

import { SharedEvents } from '../joint-plus/controller';

const BATCH_NAME = 'inspector-input';

const batchDirective: ObjectDirective = {

    bind(element, binding, vNode): void {
        element.addEventListener('focus', onFocus);
        element.addEventListener('focusout', onFocusOut);

        function onFocus() {
            vNode.context.$eventBusService.emit(SharedEvents.GRAPH_START_BATCH, BATCH_NAME);
        }
        function onFocusOut() {
            vNode.context.$eventBusService.emit(SharedEvents.GRAPH_STOP_BATCH, BATCH_NAME);
        }
    }
};

export default batchDirective;
