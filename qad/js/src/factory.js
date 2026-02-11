import { shapes } from '@joint/plus';
import { Question, Answer } from './shapes';

export function createQuestion(text) {

    return new Question({
        position: { x: 400 - 50, y: 30 },
        size: { width: 100, height: 70 },
        question: text,
        inPorts: [{ id: 'in', label: 'In' }],
        options: [
            { id: 'yes', text: 'Yes' },
            { id: 'no', text: 'No' }
        ]
    });
}

export function createAnswer(text) {

    return new Answer({
        position: { x: 400 - 50, y: 30 },
        size: { width: 100, height: 70 },
        answer: text
    });
}

export function createLink() {

    return new shapes.standard.Link({
        attrs: {
            line: {
                stroke: '#6a6c8a',
                strokeWidth: 2,
            }
        }
    });
}

export function createDialogJSON(graph, rootCell) {

    const dialog = {
        root: undefined,
        nodes: [],
        links: []
    };

    graph.getCells().forEach(function (cell) {

        const o = {
            id: cell.id,
            type: cell.get('type')
        };

        switch (cell.get('type')) {
            case 'qad.Question':
                o.question = cell.get('question');
                o.options = cell.get('options');
                dialog.nodes.push(o);
                break;
            case 'qad.Answer':
                o.answer = cell.get('answer');
                dialog.nodes.push(o);
                break;
            default: // qad.Link
                o.source = cell.get('source');
                o.target = cell.get('target');
                dialog.links.push(o);
                break;
        }

        if (!cell.isLink() && !graph.getConnectedLinks(cell, { inbound: true }).length) {
            dialog.root = cell.id;
        }
    });

    if (rootCell) {
        dialog.root = rootCell.id;
    }

    return dialog;
}
