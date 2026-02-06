import { dia, shapes, highlighters, elementTools, ui } from '@joint/plus';
import { CompositeCable, ScrewTerminal, Plug, COLOR_TERMINAL, COLOR_TERMINAL_TEXT } from './shapes';

export const init = () => {

    const cellNamespace = {
        ...shapes,
        CompositeCable,
        Plug,
        ScrewTerminal
    };

    const graph = new dia.Graph({}, { cellNamespace });

    const paper = new dia.Paper({
        el: document.getElementById('paper'),
        width: '100%',
        height: '100%',
        model: graph,
        cellViewNamespace: cellNamespace,
        overflow: true,
        clickThreshold: 10,
        interactive: {
            linkMove: false
        },
        background: {
            color: '#f9f9f9'
        },
        highlighting: {
            connecting: {
                name: 'addClass',
                options: {
                    className: 'connecting',
                }
            }
        },
        snapLinks: { radius: 10 },
        defaultConnectionPoint: { name: 'anchor' },

        connectionStrategy: function(end, view, _magnet, coords, _link) {
            const element = view.model as dia.Element;
            if (ScrewTerminal.isScrewTerminal(element) || Plug.isPlug(element)) {
                return element.connectionStrategy(end, coords);
            }
            return end;
        },

        validateConnection: function(cellViewS, magnetS, cellViewT, magnetT, end, _linkView) {
            if (magnetS === magnetT) return false;
            if (cellViewS === cellViewT) return false;
            if (end === 'target' && !cellViewT.model.get('connect')) return false;
            if (end === 'source' && !cellViewS.model.get('connect')) return false;
            return true;

        },
    });

    paper.scale(2);

    const stencil = new ui.Stencil({
        paper,
        height: null,
        layout: {
            columns: 1,
            rowHeight: 'compact',
            resizeToFit: false,
            rowGap: 10,
            marginX: 10,
            marginY: 10,
        }
    });

    stencil.render();
    document.getElementById('stencil')?.appendChild(stencil.el);

    // Populate stencil

    const terminals = Array.from({ length: 4 }, (_, i) => {
        const length = i + 1;
        return new shapes.standard.Rectangle({
            position: { x: 50, y: 50 },
            size: { width: 120, height: 40 },
            dropShape: {
                type: 'ScrewTerminal',
                length
            },
            attrs: {
                root: {
                    dataTooltip: `${length}-terminal block`,
                },
                body: {
                    fill: COLOR_TERMINAL,
                    stroke: 'none'
                },
                label: {
                    fill: COLOR_TERMINAL_TEXT,
                    fontFamily: 'Arial',
                    fontSize: 30,
                    text: `${length}`
                }
            }
        });
    });

    const cables = [
        ['#CD5334', '#0081AF', '#F4B860'],
        ['#49416D', '#CFBFF7'],
    ].map((wires) => {
        return new dia.Element({
            size: { width: 120, height: 60 },
            type: 'Cable',
            dropShape: {
                type: 'Cable',
                wires
            },
            attrs: {
                root: {
                    dataTooltip: `${wires.length}-wire cable`,
                }
            },
            markup: Array.from({ length: wires.length }, (_, i) => {
                return {
                    tagName: 'path',
                    selector: `wire-${i}`,
                    attributes: {
                        pointerEvents: 'bounding-box',
                        fill: 'none',
                        strokeWidth: 10,
                        strokeLinecap: 'butt',
                        d: 'M 10 0 C 0 60 120 0 110 60',
                        transform: `translate(${-i * 7}, ${i * 5})`,
                        stroke: wires[i],
                    }
                };
            })
        });
    });

    const plug = new shapes.standard.Path({
        size: { width: 75, height: 60 },
        dropShape: {
            type: 'Plug'
        },
        attrs: {
            root: {
                dataTooltip: 'Plug',
            },
            body: {
                fill: '#3E697A',
                stroke: '#3E697A',
                strokeWidth: 2,
                strokeLinejoin: 'round',
                d: 'M 0 0 H calc(w) V calc(h-20) L calc(w-20) calc(h) H 20 L 0 calc(h-20) Z'
            }
        }
    });

    stencil.load([
        ...cables,
        ...terminals,
        plug,
    ]);

    const tooltip = new ui.Tooltip({
        rootTarget: document.body,
        target: '[data-tooltip]',
        direction: ui.Tooltip.TooltipArrowPosition.Auto,
        positionSelector: () => stencil.el,
        padding: 12,
        animation: {
            delay: '200ms'
        }
    });

    // Create actual shape on drop

    stencil.on('element:dragstart', () => {
        tooltip.disable();
    });

    stencil.on('element:dragend', (cloneView, _evt, dropArea, _isDropValid) => {
        tooltip.enable();
        stencil.cancelDrag({ dropAnimation: false });
        const dropShape = cloneView.model.get('dropShape');
        const dropCenter = dropArea.center();
        switch (dropShape.type) {
            case 'ScrewTerminal':
                ScrewTerminal.create(graph, dropShape.length, dropCenter.x, dropCenter.y);
                break;
            case 'Cable': {
                const cable = CompositeCable.create(graph, dropShape.wires, dropCenter.x - 30, dropCenter.y, dropCenter.x + 30, dropCenter.y);
                cable.addTools(paper);
                break;
            }
            case 'Plug':
                Plug.create(graph, dropCenter.x, dropCenter.y);
                break;
        }
    });

    // Highlight ports

    paper.on('link:connect', (_linkView, _evt, elementView, magnet) => {
        const portId = elementView.findAttribute('port', magnet);
        if (!portId) return;
        highlightPort(elementView, portId);
    });

    paper.on('link:disconnect', (_linkView, _evt, elementView, magnet) => {
        const portId = elementView.findAttribute('port', magnet);
        if (!portId) return;
        const element = elementView.model as dia.Element;
        const links = findConnectedLinks(graph, element, portId);
        if (links.length > 0) return;
        unhighlightPort(elementView, portId);
    });

    // Disconnect cables on double click

    paper.on('element:magnet:pointerdblclick', (elementView, evt) => {
        const portId = elementView.findAttribute('port', evt.target);
        if (!portId) return;
        const element = elementView.model;
        disconnectCables(graph, element, portId);
        unhighlightPort(elementView, portId);
    });

    // Select element on click

    paper.on('element:pointerclick', (elementView) => {
        removeSelection(paper);
        const element = elementView.model;
        const [root = element] = element.getAncestors() as dia.Element[];
        root.findView(paper).addTools(new dia.ToolsView({
            tools: [
                new elementTools.Boundary({
                    padding: 2,
                    useModelGeometry: true,
                    attributes: {
                        stroke: '#BC63F8',
                        strokeWidth: 1,
                        strokeDasharray: '0',
                        fill: 'none',
                    }
                }),
                new elementTools.Remove({
                    x: -10,
                    y: -10,
                    useModelGeometry: true,
                    action: function() {
                        const ports = root.getPorts();
                        ports.forEach(port => disconnectCables(graph, element, port.id));
                        root.remove();
                    }
                }),
            ]
        }));
    });

    paper.on('blank:pointerclick', () => {
        removeSelection(paper);
    });

    // Helper functions

    function removeSelection(paper: dia.Paper) {
        paper.model.getElements().forEach(element => {
            if (element.getParentCell()) return;
            element.findView(paper).removeTools();
        });
    }

    function disconnectCables(graph: dia.Graph, element: dia.Element, portId: string) {
        const links = findConnectedLinks(graph, element, portId);
        links.forEach((link, index) => {
            const port = element.getPort(portId);
            const group = port.group;
            const position = element.getPortCenter(portId);
            const end = {
                x: position.x,
                y: position.y,
            };
            switch (group) {
                case 'left':
                    end.x -= 50;
                    end.y += index * 20;
                    break;
                case 'right':
                    end.x += 50;
                    end.y += index * 20;
                    break;
                case 'pins':
                    end.y += 50;
                    end.x += index * 20;
                    break;
            }
            if (link.getSourceCell() === element) {
                link.source(end);
            } else {
                link.target(end);
            }
        });
    }

    function findConnectedLinks(graph: dia.Graph, element: dia.Element, portId: string) {
        const id = element.id;
        return graph.getConnectedLinks(element).filter(link => {
            if (link.source().id === id && link.source().port === portId) return true;
            if (link.target().id === id && link.target().port === portId) return true;
            return false;
        });
    }

    function highlightPort(elementView: dia.CellView, portId: string) {
        highlighters.addClass.add(elementView, { port: portId }, `hgl-connected-${portId}`, {
            className: 'connected',
        });
    }

    function unhighlightPort(elementView: dia.CellView, portId: string) {
        highlighters.addClass.remove(elementView, `hgl-connected-${portId}`);
    }

    // Example

    const terminal1 = ScrewTerminal.create(graph, 3, 150, 150);
    const cable1 = CompositeCable.create(graph, ['#CD5334', '#0081AF', '#F4B860'], 250, 150, 300, 100);
    const [wire1] = cable1.getSourceWires();
    wire1.target({
        id: terminal1.id,
        port: 'right-1',
        anchor: { name: 'modelCenter', args: { dx: 20, dy: 5 }}
    });
    highlightPort(terminal1.findView(paper), 'right-1');
    cable1.addTools(paper);
};
