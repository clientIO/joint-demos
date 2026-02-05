/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import { dia, shapes, ui } from '@joint/plus';

import { toolbarConfig } from './config/toolbar.config';
import { BACKGROUND_COLOR, SECONDARY_BACKGROUND_COLOR, GRID_SIZE, PADDING_L, PADDING_S } from '../theme';
import './shapes/index';

export function createPlugins(
    scopeElement: Element,
    paperElement: Element,
    stencilElement: Element,
    toolbarElement: Element
) {
    // Graph
    // https://docs.jointjs.com/api/dia/SearchGraph
    const graph = new dia.SearchGraph({}, { cellNamespace: shapes });
    graph.setQuadTreeLazyMode(false);

    // Paper
    // https://docs.jointjs.com/api/dia/Paper
    const paper = new dia.Paper({
        model: graph,
        async: true,
        autoFreeze: true,
        sorting: dia.Paper.sorting.APPROX,
        gridSize: GRID_SIZE,
        linkPinning: false,
        multiLinks: false,
        snapLinks: true,
        moveThreshold: 5,
        magnetThreshold: 'onleave',
        background: { color: BACKGROUND_COLOR },
        cellViewNamespace: shapes,
        interactive: {
            labelMove: true,
            linkMove: false
        },
        defaultRouter: {
            name: 'manhattan',
            args: {
                padding: { bottom: PADDING_L, vertical: PADDING_S, horizontal: PADDING_S },
                step: GRID_SIZE
            }
        },
        defaultConnector: {
            name: 'rounded'
        },
        viewManagement: {
            disposeHidden: true,
        },
        defaultLink: () => new shapes.app.Link(),
        validateConnection: (
            sourceView: dia.CellView,
            sourceMagnet: SVGElement,
            targetView: dia.CellView,
            targetMagnet: SVGElement
        ) => {
            if (sourceView === targetView) return false;
            if (targetView.findAttribute('port-group', targetMagnet) !== 'in') return false;
            if (sourceView.findAttribute('port-group', sourceMagnet) !== 'out') return false;
            return true;
        }
    });

    // PaperScroller Plugin (Scroll & Zoom)
    // https://docs.jointjs.com/api/ui/PaperScroller
    const scroller = new ui.PaperScroller({
        paper,
        autoResizePaper: true,
        contentOptions: {
            padding: 100,
            allowNewOrigin: 'any',
            allowNegativeBottomRight: true,
            useModelGeometry: true
        },
        virtualRendering: {
            margin: 50
        },
        scrollWhileDragging: true,
        cursor: 'grab',
        baseWidth: 1000,
        baseHeight: 1000
    });
    paperElement.appendChild(scroller.el);
    scroller.render().center();

    // Stencil Plugin (Element Palette)
    // https://docs.jointjs.com/api/ui/Stencil
    const stencil = new ui.Stencil({
        paper: scroller,
        width: 240,
        scaleClones: true,
        dropAnimation: true,
        paperOptions: {
            sorting: dia.Paper.sorting.NONE,
            background: {
                color: SECONDARY_BACKGROUND_COLOR
            }
        },
        dragStartClone: (element: dia.Element) => {
            const name = element.get('name');
            // @ts-ignore
            const Shape = shapes.app[name];
            if (!Shape) throw new Error(`Invalid stencil shape name: ${name}`);
            return Shape.fromStencilShape(element);
        },
        layout: {
            columnWidth: 110,
            columns: 1,
            rowGap: PADDING_S,
            rowHeight: 'auto',
            marginY: PADDING_S,
            marginX: -PADDING_L
        }
    });
    stencilElement.appendChild(stencil.el);
    stencil.render();

    // Command Manager Plugin (Undo / Redo)
    // https://docs.jointjs.com/api/dia/CommandManager
    const history = new dia.CommandManager({
        graph
    });

    // Toolbar Plugin
    // https://docs.jointjs.com/api/ui/Toolbar
    const toolbar = new ui.Toolbar({
        tools: toolbarConfig.tools,
        autoToggle: true,
        references: {
            paperScroller: scroller,
            commandManager: history
        }
    });
    toolbarElement.appendChild(toolbar.el);
    toolbar.render();

    // Tooltip plugin
    // https://docs.jointjs.com/api/ui/Tooltip
    const tooltip = new ui.Tooltip({
        rootTarget: scopeElement,
        container: scopeElement,
        target: '[data-tooltip]',
        direction: ui.Tooltip.TooltipArrowPosition.Auto,
        padding: PADDING_S,
        animation: true
    });

    // Keyboard plugin
    // https://docs.jointjs.com/api/ui/Keyboard
    const keyboard = new ui.Keyboard();

    return { graph, paper, scroller, stencil, toolbar, tooltip, keyboard, history };
}
