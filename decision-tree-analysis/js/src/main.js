// The example is inspired by João H de A Franco's article:
// https://jhafranco.com/tag/decision-tree

import { dia, util, layout, ui } from '@joint/plus';
import './styles.css';

// Asset imports
import swordSvg from '../assets/icons/sword.svg';
import shieldSvg from '../assets/icons/shield.svg';

const rankSize = 160;
const nodeSize = 40;
const roundCount = 3;
const strategies = [
    {
        name: 'Play Fearlessly',
        icon: swordSvg,
        loose: 0.55,
        win: 0.45,
        draw: 0
    },
    {
        name: 'Play Defensively',
        icon: shieldSvg,
        loose: 0.1,
        win: 0,
        draw: 0.9
    }
];

class Node extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            size: { width: nodeSize, height: nodeSize }
        };
    }

    getBodyAttrs() {
        return {
            strokeWidth: 4,
            stroke: '#ed2637',
            fill: 'transparent'
        };
    }

    getLabelAttrs() {
        return {
            fill: '#f6f740',
            textAnchor: 'middle',
            textVerticalAlign: 'bottom',
            fontFamily: 'sans-serif',
            x: 'calc(w / 2)',
            y: -10
        };
    }
}

class DecisionMadeNode extends Node {
    defaults() {
        return {
            ...super.defaults(),
            type: 'DecisionMadeNode',
            attrs: {
                root: {
                    magnetSelector: 'body'
                },
                body: {
                    ...this.getBodyAttrs(),
                    width: 'calc(w)',
                    height: 'calc(h)'
                },
                label: {
                    ...this.getLabelAttrs()
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg`
            <rect @selector="body" />
            <text @selector="label" />
        `;
    }
}

class ChanceEventNode extends Node {
    defaults() {
        return {
            ...super.defaults(),
            type: 'ChanceEventNode',
            attrs: {
                root: {
                    magnetSelector: 'body'
                },
                body: {
                    ...this.getBodyAttrs(),
                    rx: 'calc(w / 2)',
                    ry: 'calc(h / 2)',
                    cx: 'calc(w / 2)',
                    cy: 'calc(h / 2)'
                },
                label: {
                    ...this.getLabelAttrs()
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg`
            <ellipse @selector="body" />
            <text @selector="label" />
        `;
    }
}

class EndPointNode extends Node {
    defaults() {
        return {
            ...super.defaults(),
            type: 'EndPointNode',
            attrs: {
                root: {
                    magnetSelector: 'body'
                },
                body: {
                    ...this.getBodyAttrs(),
                    d: 'M 0 calc(h / 2) L calc(w) 0 V calc(h) Z'
                },
                label: {
                    ...this.getLabelAttrs()
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg`
            <path @selector="body" />
            <text @selector="label" />
        `;
    }
}

class EndPointLabelNode extends Node {
    defaults() {
        return {
            ...super.defaults(),
            type: 'EndPointLabelNode',
            attrs: {
                label: {
                    textAnchor: 'middle',
                    fontFamily: 'sans-serif',
                    fill: '#0075f2',
                    lineHeight: 20,
                    fontSize: 16
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg`
            <text @selector="label" />
        `;
    }
}

class Link extends dia.Link {
    defaults() {
        return {
            ...super.defaults,
            type: 'Link',
            attrs: {
                line: {
                    connection: true,
                    fill: 'none',
                    stroke: '#ed2637',
                    strokeWidth: 2
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg`
            <path @selector="line" />
        `;
    }

    addRejectedLabel() {
        this.appendLabel({
            type: 'rejected-label',
            markup: util.svg`
                <rect
                    x="-17" y="-17" width="34" height="34" fill="transparent"
                    data-tooltip="Rejected Alternative"
                />
                <path
                    d="M -10 -10 0 10 M -2 -10 8 10" fill="none" stroke="#dde6ed" stroke-width="2"
                    pointer-events="none"
                />
            `,
            position: {
                distance: rankSize / 3,
                args: {
                    keepGradient: true
                }
            }
        });
    }

    removeRejectedLabel() {
        this.labels(
            this.labels().filter((label) => label.type !== 'rejected-label')
        );
    }

    addStrategyLabel(strategy) {
        this.appendLabel({
            type: 'strategy-label',
            markup: util.svg`
                <rect x="-17" y="-17" width="34" height="34" stroke="#dde6ed" fill="#131e29" rx="2" ry="2" />
                <image data-tooltip="${strategy.name}" href="${strategy.icon}" x="-15" y="-15" width="30" height="30"/>
            `,
            position: {
                distance: -rankSize / 4,
                offset: -25
            }
        });
    }

    addOutcomeLabel(outcome) {
        this.appendLabel({
            type: 'outcome-label',
            markup: util.svg`
                <text @selector="outcomeLabel" />
            `,
            attrs: {
                outcomeLabel: {
                    text: `${outcome.name}\n${Math.round(outcome.chance * 100)}%`,
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    lineHeight: 25,
                    fontSize: 15,
                    fontFamily: 'sans-serif',
                    fill: '#dde6ed'
                }
            },
            position: {
                distance: -rankSize / 4
            }
        });
    }
}

const cellNamespace = {
    DecisionMadeNode,
    ChanceEventNode,
    EndPointNode,
    EndPointLabelNode,
    Link
};

// Application code
// ----------------

const resultsEl = document.getElementById('results');

const cells = generateTreeCells(strategies, roundCount);

const graph = new dia.Graph({}, { cellNamespace });

const paper = new dia.Paper({
    el: document.getElementById('paper'),
    cellViewNamespace: cellNamespace,
    width: '100%',
    height: 2000,
    model: graph,
    async: true,
    interactive: false,
    sorting: dia.Paper.sorting.APPROX,
    background: {
        color: 'transparent'
    },
    viewport: (view) => {
        let cell = view.model;
        switch (cell.get('type')) {
            case 'Link': {
                // Show only the link if the target is visible
                cell = cell.getTargetCell();
                // EndPointLabel links are never visible
                if (cell.get('type') === 'EndPointLabelNode') return false;
                break;
            }
            case 'EndPointLabelNode': {
                // Show only the label if the connected EndPointLabel is visible
                [cell] = graph.getNeighbors(cell, { inbound: true });
                break;
            }
        }
        return !isNodeHidden(cell);
    },
    defaultRouter: (vertices) => {
        const count = vertices.length;
        return count > 0 ? [vertices[count - 1]] : vertices;
    }
});

const tree = new layout.TreeLayout({
    siblingGap: 40,
    parentGap: 160,
    graph,
    direction: 'R',
    filter: (neighbors, node) => {
        return neighbors.filter((neighbor) => !isNodeHidden(neighbor));
    }
});

graph.resetCells(cells);

const [root] = graph.getSources();

resultsEl.addEventListener('change', () => run());

run();

new ui.Tooltip({
    rootTarget: document.body,
    target: '[data-tooltip]',
    direction: 'auto',
    padding: 10,
    animation: true
});

// Functions
// ---------

function isNodeHidden(node) {
    return !!node.get('hidden');
}

function runLayout({ results } = {}) {
    graph.getElements().forEach((element) => {
        element.set('hidden', false);
    });
    graph.getLinks().forEach((link) => {
        link.removeRejectedLabel();
    });
    calculateOutcome(graph, root, { results });
    // position most of the nodes
    tree.layout();
    const bbox = tree.getLayoutBBox();
    // align the end point nodes vertically
    graph.getElements().forEach((element) => {
        if (element.get('type') !== 'EndPointNode' || isNodeHidden(element)) return;
        const { x, y, width } = element.getBBox();
        const alignedX = bbox.x + bbox.width - rankSize / 2 - width - 10;
        if (x === alignedX) return;
        element.position(alignedX, y, {
            // move the element along with its EndPointLabelNode
            deep: true
        });
    });
}

// if the number contains 0.5 then it is a written using ½ symbol
function formatNumber(number) {
    if (number === 0.5) {
        return '½';
    }
    if (number % 1 === 0.5) {
        return `${number - 0.5}½`;
    }
    return number;
}

function formatScore(score) {
    const [a, b] = score;
    return `${formatNumber(a)} vs. ${formatNumber(b)}`;
}

function generateTreeCells(strategies = [], roundCount = 3) {
    const cells = [];

    const root = new DecisionMadeNode({
        score: [0, 0],
        attrs: {
            body: {
                dataTooltip: `<b>Decision Made Node</b><br>Score: ${formatScore([
                    0,
                    0
                ])}`
            }
        }
    });

    const stack = [root];
    while (stack.length > 0) {
        const current = stack.pop();
        cells.push(current);
        strategies.forEach((strategy, index) => {
            const chanceEventNode = new ChanceEventNode({
                attrs: {
                    body: {
                        dataTooltip: `<b>Chance Event Node</b>`
                    }
                }
            });
            const chanceEventLink = new Link({
                source: { id: current.id, anchor: { name: 'right', args: { dx: 5 }}},
                target: {
                    id: chanceEventNode.id,
                    anchor: { name: 'left', args: { dx: -5 }}
                }
            });
            chanceEventLink.addStrategyLabel(strategy);
            cells.push(chanceEventNode, chanceEventLink);
            const [a, b] = current.get('score');
            const outcomes = [
                {
                    score: [a + 0.5, b + 0.5],
                    name: 'Draw',
                    chance: strategy.draw
                },
                {
                    score: [a, b + 1],
                    name: 'Lose',
                    chance: strategy.loose
                },
                {
                    score: [a + 1, b],
                    name: 'Win',
                    chance: strategy.win
                }
            ];
            outcomes.forEach((outcome) => {
                if (outcome.chance === 0) return;
                const [oa, ob] = outcome.score;
                const isTerminal =
                    oa + ob >= roundCount || oa > roundCount / 2 || ob > roundCount / 2;
                let outcomeNode;
                if (isTerminal) {
                    let result;
                    if (oa > ob) {
                        result = 'Winner';
                    } else if (oa < ob) {
                        result = 'Loser';
                    } else {
                        result = 'Draw';
                    }
                    outcomeNode = new EndPointNode({
                        size: { width: nodeSize, height: nodeSize },
                        score: outcome.score,
                        chance: outcome.chance,
                        result,
                        attrs: {
                            body: {
                                dataTooltip: `<b>Endpoint Node</b>`
                            }
                        }
                    });
                } else {
                    outcomeNode = new DecisionMadeNode({
                        size: { width: nodeSize, height: nodeSize },
                        score: outcome.score,
                        chance: outcome.chance,
                        attrs: {
                            body: {
                                dataTooltip: `<b>Decision Made Node</b><br>Score: ${formatScore(
                                    outcome.score
                                )}`
                            }
                        }
                    });
                }
                const outcomeLink = new Link({
                    source: {
                        id: chanceEventNode.id,
                        anchor: { name: 'right', args: { dx: 5 }}
                    },
                    target: {
                        id: outcomeNode.id,
                        anchor: { name: 'left', args: { dx: -5 }}
                    },
                    attrs: {
                        line: {
                            strokeDasharray: '5 5'
                        }
                    }
                });
                outcomeLink.addOutcomeLabel(outcome);
                cells.push(outcomeNode, outcomeLink);
                if (!isTerminal) {
                    // Add the outcome to the stack for the next iteration
                    stack.push(outcomeNode);
                } else {
                    // Add the end point label
                    const endPointLabelNode = new EndPointLabelNode({
                        offset: -rankSize + 50
                    });
                    const endPointLabelLink = new Link({
                        source: {
                            id: outcomeNode.id,
                            anchor: { name: 'right', args: { dx: 5 }}
                        },
                        target: {
                            id: endPointLabelNode.id,
                            anchor: { name: 'left', args: { dx: -5 }}
                        }
                    });
                    // Embed the label so it moves along with the outcome node
                    outcomeNode.embed(endPointLabelNode);
                    cells.push(endPointLabelNode, endPointLabelLink);
                }
            });
        });
    }
    return cells;
}

function calculateOutcome(
    graph,
    node,
    { results = ['Winner'], value = 1000 } = {}
) {
    if (isNodeHidden(node)) return;
    let outcome;
    if (node.get('type') !== 'EndPointNode') {
        let neighbors = graph.getNeighbors(node, { outbound: true });
        neighbors.forEach((neighbor) => {
            calculateOutcome(graph, neighbor, { value, results });
        });
        neighbors = neighbors.filter((neighbor) => !isNodeHidden(neighbor));
        if (neighbors.length === 0) {
            node.set('hidden', true);
            return;
        }
        if (node.get('type') === 'ChanceEventNode') {
            const outcomes = neighbors.map(
                (neighbor) => neighbor.get('value') * neighbor.get('chance')
            );
            outcome = outcomes.reduce((acc, outcome) => acc + outcome, 0);
        } else {
            const outcomes = neighbors.map((neighbor) => neighbor.get('value'));
            outcome = Math.max(...outcomes);
            const rejectedNeighbors = neighbors.filter(
                (neighbor) => neighbor.get('value') < outcome
            );
            rejectedNeighbors.forEach((neighbor) => {
                const [link] = graph.getConnectedLinks(neighbor, { inbound: true });
                link.addRejectedLabel();
            });
        }
    } else {
        const result = node.get('result');
        if (results.length > 0 && !results.includes(result)) {
            node.set('hidden', true);
            return;
        }
        const [labelNode] = graph.getNeighbors(node, { outbound: true });
        labelNode.attr(
            'label/text',
            `${node.get('result')}\n${formatScore(node.get('score'))}`
        );
        switch (result) {
            case 'Winner':
                outcome = value;
                break;
            case 'Loser':
                outcome = 0;
                break;
            case 'Draw':
                outcome = value / 2;
                break;
        }
    }
    node.set('value', outcome);
    node.attr('label/text', `$${Math.round(outcome)}`);
}

// Set the size of the paper to fit the graph
function resizePaper(paper, contentArea) {
    const { offsetHeight, offsetWidth } = document.body;
    const height = Math.max(
        (offsetWidth / contentArea.width) * contentArea.height,
        offsetHeight
    );
    paper.setDimensions('100%', height);
    paper.scaleContentToFit({ contentArea });
}

function run() {
    const inputs = Array.from(resultsEl.querySelectorAll('input'));
    const results = inputs
        .filter((input) => input.checked)
        .map((input) => input.name);
    runLayout({ results });
    resizePaper(paper, tree.getLayoutBBox().inflate(100));
}
