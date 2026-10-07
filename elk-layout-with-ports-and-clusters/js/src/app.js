import { dia, shapes } from '@joint/core';

import { layout } from '@joint/layout-elk';
import { Child, Label, Edge } from './shapes';
import elkGraph from '../elkGraph.json';

const fullViewThreshold = 0.7;
const minimalViewThreshold = 0.4;

export const init = () => {
    const canvas = document.getElementById('canvas');

    const graph = new dia.Graph({}, { cellNamespace: shapes });

    const paper = new dia.Paper({
        model: graph,
        cellViewNamespace: shapes,
        width: 1000,
        height: 600,
        gridSize: 1,
        interactive: false,
        async: true,
        frozen: true,
        background: { color: '#F3F7F6' },
        viewport: (view) => {
            const { sx } = paper.scale();
            const cell = view.model;
            if (!cell) return true;
            if (sx <= fullViewThreshold) {
                switch (cell.get('type')) {
                    case 'app.Label': {
                        if (sx < minimalViewThreshold) return false;
                        return !cell.getParentCell().isEmbedded() && cell.get('simplifiedViewLabel');
                    }
                    case 'app.Edge': {
                        return !cell.getTargetCell().isEmbedded() && !cell.getSourceCell().isEmbedded();
                    }
                    case 'standard.Circle': {
                        // Junction Points
                        return false;
                    }
                    default: {
                        return !cell.isEmbedded();
                    }
                }
            }
            return true;
        }
    });

    function toggleViewClass() {
        const { sx } = paper.scale();
        paper.el.classList.toggle('full-view', sx > fullViewThreshold);
        paper.el.classList.toggle('minimal-view', sx < minimalViewThreshold);
    }

    paper.on('scale', () => toggleViewClass());
    toggleViewClass();

    const mapPortIdToShapeId = {};
    // The node labels are separate elements, which are embedded into their
    // node once the layout is done (ELK computes their position).
    const nodeLabels = new Map();

    const addChildren = (children, parent) => {
        children.forEach(child => {

            const { ports = [], children = [], labels = [] } = child;

            // The size of a cluster is computed by ELK to fit its content
            const shape = new Child({
                id: child.id,
                size: { width: child.width || 0, height: child.height || 0 },
            });

            ports.forEach(port => {
                const portToAdd = {
                    group: 'port',
                    id: port.id,
                    size: { height: port.height || 0, width: port.width || 0 },
                    // The side of the node the port is placed on by ELK
                    side: port.layoutOptions['port.side']
                };
                shape.addPort(portToAdd);
                mapPortIdToShapeId[port.id] = shape.id;
            });

            shape.addTo(graph);

            if (parent) {
                parent.embed(shape);
            }

            if (children.length > 0) {
                addChildren(children, shape);
            }

            if (child.edges) {
                addEdges(child.edges);
            }

            nodeLabels.set(shape.id, labels.map(label => {

                const labelElement = new Label({
                    simplifiedViewLabel: children.length === 0,
                    size: { width: label.width, height: label.height },
                    placement: label.layoutOptions['nodeLabels.placement'],
                    attrs: {
                        label: {
                            fontSize: label.height,
                            text: label.text,
                            ...getLabelPlacement(label)
                        }
                    }
                });

                if (children.length > 0) {
                    shape.attr('label/text', label.text);
                }

                labelElement.addTo(graph);
                return labelElement;
            }));
        });
    };

    const addEdges = (edges) => {
        edges.forEach((link) => {

            const sourcePortId = link.sources[0];
            const targetPortId = link.targets[0];
            const sourceElementId = mapPortIdToShapeId[sourcePortId];
            const targetElementId = mapPortIdToShapeId[targetPortId];

            const shape = new Edge({
                source: {
                    id: sourceElementId,
                    port: sourcePortId
                },
                target: {
                    id: targetElementId,
                    port: targetPortId,
                }
            });

            shape.addTo(graph);
        });
    };

    const addJunctionPoints = (node) => {
        // The coordinates of the edges are absolute (`elk.json.edgeCoords: ROOT`)
        (node.edges || []).forEach(edge => {
            (edge.junctionPoints || []).forEach(point => {
                const SIZE = 4;
                const junctionPoint = new shapes.standard.Circle({
                    position: {
                        x: point.x - SIZE / 2,
                        y: point.y - SIZE / 2
                    },
                    size: { height: SIZE, width: SIZE },
                    attrs: {
                        body: {
                            fill: '#464454',
                            stroke: '#464454',
                        }
                    }
                });
                junctionPoint.addTo(graph);
            });
        });
        (node.children || []).forEach(child => addJunctionPoints(child));
    };

    addChildren(elkGraph.children || []);
    addEdges(elkGraph.edges || []);

    layout({ graph }, {
        exportElement:({ element, elkNode }) => {
            // The labels are not laid out as nodes, but as labels of their node
            if (element instanceof Label) return false;
            // ELK places the ports on their side (instead of keeping them in place)
            elkNode.layoutOptions['elk.portConstraints'] = 'FIXED_ORDER';
            elkNode.labels = nodeLabels.get(element.id).map(labelElement => ({
                text: labelElement.attr('label/text'),
                ...labelElement.size(),
                layoutOptions: {
                    'elk.nodeLabels.placement': labelElement.get('placement')
                }
            }));
        },
        exportPort: ({ element, portId, elkPort }) => {
            elkPort.layoutOptions['elk.port.side'] = element.portProp(portId, 'side');
            elkPort.layoutOptions['elk.port.index'] = `${element.getPortIndex(portId)}`;
        },
        setPortAttributes: ({ element, portId, elkPort }) => {
            // Keep the port where ELK placed it (next to the node border),
            // its top-left corner is the position of the port.
            element.portProp(portId, 'args', { x: elkPort.x, y: elkPort.y });
        },
        setElementAttributes: ({ element, attributes, elkNode }) => {
            element.set(attributes);
            const { position, size } = attributes;
            nodeLabels.get(element.id).forEach((labelElement, index) => {
                const { x = 0, y = 0 } = elkNode.labels[index];
                labelElement.position(position.x + x, position.y + y);
                element.embed(labelElement);
            });
            if (size) {
                // The cluster label is displayed inside the cluster in the simplified view
                element.attr('label/fontSize', size.width / 5);
            }
        }
    }).then(({ elkGraph: laidOutGraph }) => {
        addJunctionPoints(laidOutGraph);

        paper.unfreeze();
        paper.fitToContent({ useModelGeometry: true, padding: 100, allowNewOrigin: 'any' });
    });

    canvas.appendChild(paper.el);

    addZoomListeners(paper);
};

const addZoomListeners = paper => {
    let zoomLevel = 1;

    const zoom = zoomLevel => {
        paper.scale(zoomLevel);
        paper.fitToContent({ useModelGeometry: true, padding: 100 * zoomLevel, allowNewOrigin: 'any' });
    };

    document.getElementById('zoom-in').addEventListener('click', () => {
        zoomLevel = Math.min(3, zoomLevel + 0.2);
        zoom(zoomLevel);
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        zoomLevel = Math.max(0.2, zoomLevel - 0.2);
        zoom(zoomLevel);
    });
};

const placementsOptions = {
    H_RIGHT: 'H_RIGHT',
    H_LEFT: 'H_LEFT',
    H_CENTER: 'H_CENTER',
    V_TOP: 'V_TOP',
    V_BOTTOM: 'V_BOTTOM',
    V_CENTER: 'V_CENTER',
};

const getLabelPlacement = label => {
    const placement = {};

    const nodeLabelPlacements = label.layoutOptions['nodeLabels.placement'];
    if (nodeLabelPlacements.includes(placementsOptions.H_RIGHT)) {
        placement.textAnchor = 'end';
        placement.x = label.width;
    } else if (nodeLabelPlacements.includes(placementsOptions.H_LEFT)) {
        placement.textAnchor = 'start';
    } else if (nodeLabelPlacements.includes(placementsOptions.H_CENTER)) {
        placement.textAnchor = 'middle';
        placement.x = label.width / 2;
    }

    if (nodeLabelPlacements.includes(placementsOptions.V_TOP)) {
        placement.textVerticalAnchor = 'top';
    } else if (nodeLabelPlacements.includes(placementsOptions.V_BOTTOM)) {
        placement.textVerticalAnchor = 'bottom';
        placement.y = label.height;
    } else if (nodeLabelPlacements.includes(placementsOptions.V_CENTER)) {
        placement.textVerticalAnchor = 'middle';
        placement.y = label.height / 2;
    }

    return placement;
};
