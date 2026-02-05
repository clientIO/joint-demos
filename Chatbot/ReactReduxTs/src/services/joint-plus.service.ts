/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import type { dia, ui } from '@joint/plus';

import type { Controller } from '../joint-plus/controller';
import { createPlugins } from '../joint-plus/plugins';
import { JointPlusController, KeyboardController } from '../joint-plus/controllers';
import { actionCreator } from '../redux/helpers/actionCreator';
import { STORE_JOINT } from '../redux/helpers/actionTypes';

export class JointPlusService {

    public controllers: { joint: Controller, keyboard: Controller };
    public graph: dia.Graph;
    public history: dia.CommandManager;
    public keyboard: ui.Keyboard;
    public paper: dia.Paper;
    public selection: dia.Cell[] = [];
    public scroller: ui.PaperScroller;
    public stencil: ui.Stencil;
    public toolbar: ui.Toolbar;
    public tooltip: ui.Tooltip;

    constructor(
        private scopeElement: Element,
        paperElement: Element,
        stencilElement: Element,
        toolbarElement: Element,
        public readonly dispatch: (...args: any[]) => any,
    ) {
        Object.assign(this, createPlugins(scopeElement, paperElement, stencilElement, toolbarElement));
        this.controllers = {
            joint: new JointPlusController(this),
            keyboard: new KeyboardController(this)
        };
        this.dispatch(actionCreator(STORE_JOINT, this));
    }

    public destroy(): void {
        const { paper, scroller, stencil, toolbar, tooltip, controllers } = this;
        paper.remove();
        scroller.remove();
        stencil.remove();
        toolbar.remove();
        tooltip.remove();
        Object.keys(controllers).forEach(name => (controllers as any)[name].stopListening());
    }
}

export default JointPlusService;
