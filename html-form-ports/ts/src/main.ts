import { dia, shapes } from '@joint/core';

import { FIELDS, FormElement, FormElementView } from './form-element';
import { InterfaceElement, InterfaceElementView } from './interface-element';

import '../styles.css';

const cellNamespace = {
    ...shapes,
    FormElement,
    FormElementView,
    InterfaceElement,
    InterfaceElementView
};

// Mapping direction: data flows out of "out" ports into "in" ports.
// - input interface (side 'right') rows are out ports
// - output interface (side 'left') rows are in ports
// - form input fields are in ports, computed fields are out ports
function isOutPort(cell: dia.Cell, port?: string): boolean {
    if (!port) return false;
    if (cell instanceof InterfaceElement) return cell.get('side') === 'right';
    if (cell instanceof FormElement) return FIELDS.find((field) => field.name === port)?.computed === true;
    return false;
}

function isInPort(cell: dia.Cell, port?: string): boolean {
    if (!port) return false;
    if (cell instanceof InterfaceElement) return cell.get('side') === 'left';
    if (cell instanceof FormElement) return FIELDS.find((field) => field.name === port)?.computed !== true;
    return false;
}

// A single source of truth for the mapping link style — used both by the
// interactive link creation (defaultLink) and the seeded mappings.
function createMappingLink(): shapes.standard.Link {
    return new shapes.standard.Link({
        attrs: {
            line: {
                stroke: '#4666e5',
                strokeWidth: 2
            }
        }
    });
}

const graph = new dia.Graph({}, { cellNamespace });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: cellNamespace,
    width: '100%',
    height: '100%',
    gridSize: 10,
    background: { color: '#f3f7f6' },
    linkPinning: false,
    snapLinks: { radius: 20 },
    defaultLink: () => createMappingLink(),
    defaultConnector: { name: 'smooth' },
    defaultAnchor: { name: 'midSide', args: { useModelGeometry: true, padding: 6 }},
    defaultConnectionPoint: { name: 'anchor' },
    // New links can only start from an out port.
    validateMagnet: (cellView, magnet) =>
        isOutPort(cellView.model, cellView.findAttribute('port', magnet) ?? undefined),
    // Links go from an out port to an in port and each in port accepts
    // at most one inbound link.
    validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet, _end, linkView) => {
        if (sourceView === targetView) return false;
        const sourcePort = sourceView.findAttribute('port', sourceMagnet) ?? undefined;
        const targetPort = targetView.findAttribute('port', targetMagnet) ?? undefined;
        if (!isOutPort(sourceView.model, sourcePort)) return false;
        if (!isInPort(targetView.model, targetPort)) return false;
        const otherInboundLinks = graph
            .getConnectedLinks(targetView.model, { inbound: true })
            .filter((link) => link !== linkView.model && link.target().port === targetPort);
        return otherInboundLinks.length === 0;
    },
    // Let the user interact with the form controls inside the elements
    // (focus, type) without starting an element drag.
    guard: (evt) => (evt.target as HTMLElement).tagName === 'INPUT'
});

document.getElementById('paper-container')!.appendChild(paper.el);

const input = new InterfaceElement({
    position: { x: 20, y: 120 },
    size: { width: 180, height: 130 },
    title: 'Input',
    side: 'right',
    items: [
        { id: 'firstName', label: 'First name', value: 'John' },
        { id: 'lastName', label: 'Last name', value: 'Doe' },
        { id: 'company', label: 'Company', value: 'Acme' }
    ]
});

const form = new FormElement({
    position: { x: 260, y: 60 },
    title: 'Person mapping',
    fields: { firstName: '', lastName: '', company: '' }
});

const output = new InterfaceElement({
    position: { x: 580, y: 250 },
    size: { width: 200, height: 100 },
    title: 'Output',
    side: 'left',
    items: [
        { id: 'fullName', label: 'Full name' },
        { id: 'email', label: 'Email' }
    ]
});

const mappings = [
    { source: { id: input.id, port: 'firstName' }, target: { id: form.id, port: 'firstName' }},
    { source: { id: input.id, port: 'lastName' }, target: { id: form.id, port: 'lastName' }},
    { source: { id: input.id, port: 'company' }, target: { id: form.id, port: 'company' }},
    { source: { id: form.id, port: 'fullName' }, target: { id: output.id, port: 'fullName' }},
    { source: { id: form.id, port: 'email' }, target: { id: output.id, port: 'email' }}
].map((ends) => createMappingLink().set(ends));

graph.addCells([input, form, output, ...mappings]);

// Data propagation along the mapping links.
function getPortValue(cell: dia.Cell | null, port?: string): string {
    if (!port) return '';
    if (cell instanceof InterfaceElement) return cell.getItemValue(port);
    if (cell instanceof FormElement) return String(cell.prop(['fields', port]) ?? '');
    return '';
}

function setPortValue(cell: dia.Cell | null, port: string | undefined, value: string): void {
    if (!port) return;
    if (cell instanceof InterfaceElement) {
        cell.setItemValue(port, value);
    } else if (cell instanceof FormElement) {
        cell.prop(['fields', port], value);
    }
}

function propagateLink(link: dia.Link): void {
    const sourcePort = link.source().port;
    const targetPort = link.target().port;
    if (!sourcePort || !targetPort) return;
    setPortValue(link.getTargetCell(), targetPort, getPortValue(link.getSourceCell(), sourcePort));
}

graph.on('remove', (cell: dia.Cell) => {
    if (!cell.isLink()) return;
    // Clear the target of the removed mapping (form field or output item) —
    // dependent computed fields and mappings recalculate via 'change:fields'.
    setPortValue(cell.getTargetCell(), cell.target().port, '');
});

// A click removes a link.
paper.on('link:pointerclick', (linkView) => linkView.model.remove());

// Live preview while a link is being dragged — propagate the value as soon
// as the arrowhead snaps to a port and clear it again when it snaps away.
paper.on('link:snap:connect', (linkView) => {
    propagateLink(linkView.model);
});

paper.on('link:snap:disconnect', (linkView, _evt, prevCellView, prevMagnet, arrowhead) => {
    if (arrowhead !== 'target') return;
    const cell = prevCellView.model;
    const port = prevCellView.findAttribute('port', prevMagnet);
    if (!port || cell.isLink()) return;
    setPortValue(cell, port, '');
    // Restore the value from another mapping still connected to the port.
    graph.getConnectedLinks(cell, { inbound: true })
        .filter((link) => link !== linkView.model && link.target().port === port)
        .forEach(propagateLink);
});

graph.on('change:fields', (element: dia.Element) => {
    graph.getConnectedLinks(element, { outbound: true }).forEach(propagateLink);
});

graph.getLinks().forEach(propagateLink);

// Expose for console experiments (e.g. `form.prop('fields/firstName', 'Jane')`
// or resizing to watch the ports re-align with the inputs).
Object.assign(window, { graph, paper, input, form, output });
