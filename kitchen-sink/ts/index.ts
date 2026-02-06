/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import * as joint from '@joint/plus';
import '@joint/plus/joint-plus.css';
import '/css/styles.scss';

import KitchenSinkService from './src/services/kitchensink-service';
import { StencilService } from './src/services/stencil-service';
import { ToolbarService } from './src/services/toolbar-service';
import { InspectorService } from './src/services/inspector-service';
import { HaloService } from './src/services/halo-service';
import { KeyboardService } from './src/services/keyboard-service';
import { NavigatorService } from './src/services/navigator-service';

import { sampleGraphs } from './src/config/sample-graphs';

const stencilContainer = document.querySelector<HTMLElement>('.stencil-container');

const services = {
    stencilService: new StencilService(stencilContainer),
    toolbarService: new ToolbarService(document.querySelector('.toolbar-container')),
    inspectorService: new InspectorService({
        openGroupsButton: document.querySelector<HTMLButtonElement>('button.open-groups-btn'),
        closeGroupsButton: document.querySelector<HTMLButtonElement>('button.close-groups-btn'),
        container: document.querySelector('.inspector-container'),
        header: document.querySelector('.inspector-header'),
        content: document.querySelector('.inspector-content')
    }),
    haloService: new HaloService(),
    keyboardService: new KeyboardService(),
    navigatorService: new NavigatorService(document.querySelector('.navigator-container'))
};

const app = new KitchenSinkService(
    document.getElementById('app'),
    document.querySelector('.paper-container'),
    services
);

app.startRappid();

app.graph.fromJSON(JSON.parse(sampleGraphs.emergencyProcedure));
app.commandManager.reset();

// for easier debugging in the browser's console
declare let window: any;
window['joint'] = joint;
window['app'] = app;
