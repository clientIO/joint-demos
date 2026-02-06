import { mvc, V } from '@joint/plus';
import { openMockDialog } from './dialog-actions';
import { START_NODE_ID } from '../diagram/const';
import { Node } from '../diagram/models';
import { addEffect, Effect, removeEffect } from '../diagram/effects';
import { State } from '../const';
import Theme from '../diagram/theme';

import type { dia } from '@joint/plus';
import type { App } from '../app';

/** Interval in milliseconds between testing each node in the workflow */
const TEST_INTERVAL = 2000;

let stopCurrentWorkflow: (() => void) | null = null;

/**
 * Animate testing of the current workflow by highlighting nodes and links in DFS order.
 * For demonstration purposes only.
 */
export function testCurrentWorkflow(app: App) {
    const { paper, graph, history, state  } = app;

    if (state.get(State.FlowRunning)) {
        // The workflow is already running, stop it.
        stopCurrentWorkflow?.();
        return;
    }

    const start = graph.getCell(START_NODE_ID) as dia.Element | null;
    if (!start) {
        throw new Error('The workflow does not have a start trigger node.');
    }

    // Collect all nodes in DFS order starting from the start node
    // Note: The current node collection order is not guaranteed to be in left-to-right order.
    // That is suboptimal, but sufficient for the purpose of this demo.
    const dfsOrder: Node[] = [];
    graph.dfs(start, (el: dia.Element) => {
        if (el instanceof Node) {
            dfsOrder.push(el);
        }
        return true;
    });

    // Style for animated links during testing
    const scope = `#${paper.svg.id}`;
    const stylesEl = V.createSVGStyle(/* css */`
        ${scope} .joint-type-edge [joint-selector="line"] {
            stroke: ${Theme.FlowColorDynamic};
            stroke-width: 1;
            stroke-dasharray: 5;
            stroke-dashoffset: 10;
            animation: dash 0.5s infinite linear;
        }
        ${scope} .joint-type-edge [joint-selector="wrapper"] {
            stroke: ${Theme.FlowColorStatic};
            stroke-width: 4;
        }
        @keyframes dash {
            to {
                stroke-dashoffset: 0;
            }
        }
    `);

    // Stop testing whenever the data changes
    const listener = new mvc.Listener();
    listener.listenTo(history, 'stack', () => stopTesting());

    let intervalId: number;
    startTesting();
    stopCurrentWorkflow = stopTesting;

    function startTesting() {
        // Animate the links
        paper.svg.prepend(stylesEl);
        // Animate nodes one by one in DFS order
        testNodes();
        // Update the test button state
        setTestButtonState(app, true);
    }

    function testNodes() {
        const node = dfsOrder.shift();
        if (node) {
            testNode(node);
            intervalId = setTimeout(() => testNodes(), TEST_INTERVAL);
        } else {
            stopTesting();
            return;
        }
    }

    function testNode(node: Node) {
        // Simulate testing logic here
        removeEffect(paper, Effect.NodePulse);
        addEffect(node.findView(paper), Effect.NodePulse);
        // Let the app know that the flow is running
        state.set(State.FlowRunning, true);
    }

    function stopTesting() {
        listener.stopListening();
        clearTimeout(intervalId);
        removeEffect(paper, Effect.NodePulse);
        // Stop animating links
        stylesEl.remove();
        // Reset the test button
        setTestButtonState(app, false);
        // Let the app know that the flow has stopped running
        state.set(State.FlowRunning, false);
        stopCurrentWorkflow = null;
    }
}

/**
 * Set the test button state to running or not running.
 */
function setTestButtonState(app: App, running: boolean) {
    const { toolbar } = app;
    const testButtonEl = toolbar.getWidgetByName('test').el as HTMLButtonElement;

    if (running) {
        testButtonEl.textContent = '⏸ Testing';
        const dotsEl = document.createElement('div');
        dotsEl.className = 'dot-flashing';
        testButtonEl.appendChild(dotsEl);
    } else {
        testButtonEl.textContent = '▶ Test flow';
    }
}

/**
 * Not implemented yet.
 * It means to publish the workflow to a production environment.
 */
export function publishCurrentWorkflow(app: App) {

    openMockDialog(app);
}
