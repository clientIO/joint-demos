import { dia, ui, V, mvc, shapes, linkTools } from '@joint/plus';
import { Question, QuestionView, Answer } from './shapes';
import { createQuestion, createAnswer, createLink, createDialogJSON } from './factory';
import { Selection, SelectionView } from './selection';
import { renderDialog } from './snippet';
import '../css/main.css';

const namespace = {
    ...shapes,
    qad: {
        Question,
        QuestionView,
        Answer,
    }
}

export const AppView = mvc.View.extend({

    el: '#app',

    qadDialogCounter: 0,

    events: {
        'click #toolbar .add-question': 'addQuestion',
        'click #toolbar .add-answer': 'addAnswer',
        'click #toolbar .preview-dialog': 'previewDialog',
        'click #toolbar .code-snippet': 'showCodeSnippet',
        'click #toolbar .load-example': 'loadExample',
        'click #toolbar .clear': 'clear'
    },

    init: function () {

        this.initializePaper();
        this.initializeSelection();
        this.initializeHalo();
        this.initializeInlineTextEditor();
        this.initializeTooltips();
        this.initializeLinkHover();

        this.loadExample();
    },

    initializeTooltips: function () {

        new ui.Tooltip({
            rootTarget: '#paper',
            target: '.joint-element',
            content: function (target) {

                const cell = this.paper.findView(target).model;

                let text = '- Double-click to edit text inline.';
                if (cell.get('type') === 'qad.Question') {
                    text += '<br/><br/>- Connect a port with another Question or an Answer.';
                }

                return text;

            }.bind(this),
            direction: 'right',
            right: '#paper',
            padding: 20
        });
    },

    initializeInlineTextEditor: function () {

        let cellViewUnderEdit;

        const closeEditor = () => {

            if (this.textEditor) {
                this.textEditor.remove();
                // Re-enable dragging after inline editing.
                cellViewUnderEdit.setInteractivity(true);
                this.textEditor = cellViewUnderEdit = undefined;
            }
        };

        this.paper.on('cell:pointerdblclick', function (cellView, evt) {

            // Clean up the old text editor if there was one.
            closeEditor();

            const vTarget = V(evt.target);
            let text;
            const cell = cellView.model;
            const options = cell.get('options') || [];

            switch (cell.get('type')) {

                case 'qad.Question':

                    text = ui.TextEditor.getTextElement(evt.target);
                    if (!text) {
                        break;
                    }
                    if (vTarget.hasClass('body') || V(text).hasClass('question-text')) {

                        text = cellView.el.querySelector('.question-text');
                        cellView.textEditPath = 'question';
                        cellView.optionId = null;

                    } else if (V(text).hasClass('option-text')) {

                        cellView.textEditPath = 'options/' + options.findIndex((o) => o.id === V(text.parentNode).attr('option-id')) + '/text';
                        cellView.optionId = V(text.parentNode).attr('option-id');

                    } else if (vTarget.hasClass('option-rect')) {

                        text = V(vTarget.node.parentNode).find('.option-text');
                        cellView.textEditPath = 'options/' + options.findIndex((o) => o.id === V(vTarget.node.parentNode).attr('option-id')) + '/text';
                    }
                    break;

                case 'qad.Answer':
                    text = ui.TextEditor.getTextElement(evt.target);
                    cellView.textEditPath = 'answer';
                    break;
            }

            if (text) {

                this.textEditor = new ui.TextEditor({ text: text });
                this.textEditor.render(this.paper.el);

                this.textEditor.on('text:change', function (newText) {

                    const cellUnderEdit = cellViewUnderEdit.model;
                    // TODO: prop() changes options and so options are re-rendered
                    // (they are rendered dynamically).
                    // This means that the `text` SVG element passed to the ui.TextEditor
                    // no longer exists! An exception is thrown subsequently.
                    // What do we do here?
                    cellUnderEdit.prop(cellViewUnderEdit.textEditPath, newText);

                    // A temporary solution or the right one? We just
                    // replace the SVG text element of the textEditor options object with the new one
                    // that was dynamically created as a reaction on the `prop` change.
                    if (cellViewUnderEdit.optionId) {
                        this.textEditor.options.text = cellViewUnderEdit.el.querySelector('.option.option-' + cellViewUnderEdit.optionId + ' .option-text');
                    }

                }, this);

                cellViewUnderEdit = cellView;
                // Prevent dragging during inline editing.
                cellViewUnderEdit.setInteractivity(false);
            }
        }, this);

        document.body.addEventListener('click', (evt) => {
            const text = ui.TextEditor.getTextElement(evt.target);
            if (this.textEditor && !text) {
                closeEditor();
            }
        });
    },

    initializeHalo: function () {

        this.paper.on('element:pointerup', function (elementView, evt) {

            const halo = new ui.Halo({
                cellView: elementView,
                useModelGeometry: true,
                type: 'toolbar'
            });

            halo.removeHandle('resize')
                .removeHandle('rotate')
                .removeHandle('fork')
                .removeHandle('link')
                .render();

        }, this);
    },

    initializeSelection: function () {

        const paper = this.paper;
        const graph = this.graph;
        const selection = this.selection = new Selection();

        selection.on('add reset', function () {
            const cell = this.selection.first();
            if (cell) {
                this.status('Selection: ' + cell.get('type'));
            } else {
                this.status('Selection emptied.');
            }
        }, this);

        paper.on({
            'element:pointerup': function (elementView) {
                this.selection.reset([elementView.model]);
            },
            'blank:pointerdown': function () {
                this.selection.reset([]);
            }
        }, this);

        graph.on('remove', function () {
            this.selection.reset([]);
        }, this);

        new SelectionView({
            model: selection,
            paper: paper
        });

        document.body.addEventListener('keydown', (evt) => {

            const code = evt.which || evt.keyCode;
            // Do not remove the element with backspace if we're in inline text editing.
            if ((code === 8 || code === 46) && !this.textEditor && !this.selection.isEmpty()) {
                this.selection.first().remove();
                this.selection.reset([]);
                return false;
            }

            return true;

        }, false);
    },

    initializeLinkHover: function () {

        this.paper.on('link:mouseenter', (linkView) => {
            const toolsView = new dia.ToolsView({
                tools: [
                    new linkTools.Remove({
                        distance: 30
                    }),
                    new linkTools.SourceArrowhead(),
                    new linkTools.TargetArrowhead(),
                ]
            });
            linkView.addTools(toolsView);
        });

        this.paper.on('link:mouseleave', (linkView) => {
            linkView.removeTools();
        });
    },

    initializePaper: function () {

        this.graph = new dia.Graph({}, { cellNamespace: namespace });

        this.paper = new dia.Paper({
            el: document.getElementById('paper'),
            model: this.graph,
            cellViewNamespace: namespace,
            width: 800,
            height: 600,
            gridSize: 10,
            snapLinks: {
                radius: 75
            },
            linkPinning: false,
            multiLinks: false,
            defaultLink: createLink(),
            defaultRouter: { name: 'manhattan', args: { padding: 20 } },
            defaultConnector: { name: 'rounded' },
            validateConnection: function (cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
                // Prevent linking from input ports.
                if (magnetS && magnetS.getAttribute('port-group') === 'in') return false;
                // Prevent linking from output ports to input ports within one element.
                if (cellViewS === cellViewT) return false;
                // Prevent linking to input ports.
                return (magnetT && magnetT.getAttribute('port-group') === 'in') || (cellViewS.model.get('type') === 'qad.Question' && cellViewT.model.get('type') === 'qad.Answer');
            },
            validateMagnet: function (cellView, magnet) {
                // Note that this is the default behaviour. Just showing it here for reference.
                return magnet.getAttribute('magnet') !== 'passive';
            }
        });
    },

    // Show a message in the statusbar.
    status: function (m) {
        this.el.querySelector('#statusbar .message').textContent = m;
    },

    addQuestion: function () {

        createQuestion('Question').addTo(this.graph);
        this.status('Question added.');
    },

    addAnswer: function () {

        createAnswer('Answer').addTo(this.graph);
        this.status('Answer added.');
    },

    previewDialog: function () {

        const previewEl = document.getElementById('preview');

        const cell = this.selection.first();
        const dialogJSON = createDialogJSON(this.graph, cell);
        const backgroundEl = document.createElement('div');
        backgroundEl.classList.add('background');
        backgroundEl.addEventListener('click', function () {
            previewEl.replaceChildren();
        });

        previewEl.replaceChildren();
        previewEl.appendChild(backgroundEl);
        previewEl.appendChild(renderDialog(dialogJSON));
        previewEl.style.display = 'block';
    },

    clear: function () {

        this.graph.clear();
    },

    showCodeSnippet: function () {

        const cell = this.selection.first();
        const dialogJSON = createDialogJSON(this.graph, cell);

        const id = `qad-dialog-${this.qadDialogCounter++}`;

        let snippet = '';
        snippet += '<div id="' + id + '"></div>';
        snippet += '<link rel="stylesheet" type="text/css" href="http://qad.client.io/css/snippet.css"></script>';
        snippet += '<script type="text/javascript" src="http://qad.client.io/src/snippet.js"></script>';
        snippet += '<script type="text/javascript">';
        snippet += 'document.getElementById("' + id + '").appendChild(qad.renderDialog(' + JSON.stringify(dialogJSON) + '))';
        snippet += '</script>';

        const content = '<textarea>' + snippet + '</textarea>';

        const dialog = new ui.Dialog({
            width: '50%',
            height: 200,
            draggable: true,
            title: 'Copy-paste this snippet to your HTML page.',
            content: content
        });

        dialog.open();
    },

    loadExample: function () {

        this.selection.reset([]);
        this.graph.fromJSON({
            cells: [
                {
                    type: 'qad.Question',
                    optionHeight: 30,
                    questionHeight: 45,
                    paddingBottom: 30,
                    minWidth: 150,
                    ports: {
                        groups: {
                            in: {
                                position: 'top',
                                attrs: {
                                    circle: {
                                        magnet: 'passive',
                                        stroke: 'white',
                                        fill: '#feb663',
                                        r: 14,
                                    },
                                    text: {
                                        pointerEvents: 'none',
                                        fontSize: 12,
                                        fill: 'white',
                                    },
                                },
                                label: {
                                    position: { name: 'left', args: { x: 5 } },
                                },
                            },
                            out: {
                                position: 'right',
                                attrs: {
                                    circle: {
                                        magnet: true,
                                        stroke: 'none',
                                        fill: '#31d0c6',
                                        r: 14,
                                    },
                                },
                            },
                        },
                        items: [
                            {
                                group: 'in',
                                attrs: { text: { text: 'in' } },
                                id: '0827c5d5-e3e4-47db-b2a7-665e47e5ffbc',
                            },
                            { group: 'out', id: 'yes', args: { y: 60 } },
                            { group: 'out', id: 'no', args: { y: 90 } },
                        ],
                    },
                    position: { x: 45, y: 38 },
                    size: { width: 150.3125, height: 135 },
                    angle: 0,
                    question: 'Does the thing work?',
                    inPorts: [{ id: 'in', label: 'In' }],
                    options: [
                        { id: 'yes', text: 'Yes' },
                        { id: 'no', text: 'No' },
                    ],
                    id: '41dd3458-88ec-4c64-a90c-1e2852dd2af5',
                    z: 1,
                    attrs: {
                        '.question-text': { text: 'Does the thing work?' },
                        '.options': { transform: 'translate(0, 45)' },
                        '.option-yes': {
                            transform: 'translate(0, 0)',
                            dynamic: true,
                        },
                        '.option-yes .option-rect': {
                            height: 30,
                            dynamic: true,
                        },
                        '.option-yes .option-text': {
                            text: 'Yes',
                            dynamic: true,
                            refY: 15,
                        },
                        '.option-no': {
                            transform: 'translate(0, 30)',
                            dynamic: true,
                        },
                        '.option-no .option-rect': {
                            height: 30,
                            dynamic: true,
                        },
                        '.option-no .option-text': {
                            text: 'No',
                            dynamic: true,
                            refY: 15,
                        },
                    },
                },
                {
                    type: 'qad.Question',
                    optionHeight: 30,
                    questionHeight: 45,
                    paddingBottom: 30,
                    minWidth: 150,
                    ports: {
                        groups: {
                            in: {
                                position: 'top',
                                attrs: {
                                    circle: {
                                        magnet: 'passive',
                                        stroke: 'white',
                                        fill: '#feb663',
                                        r: 14,
                                    },
                                    text: {
                                        pointerEvents: 'none',
                                        fontSize: 12,
                                        fill: 'white',
                                    },
                                },
                                label: {
                                    position: { name: 'left', args: { x: 5 } },
                                },
                            },
                            out: {
                                position: 'right',
                                attrs: {
                                    circle: {
                                        magnet: true,
                                        stroke: 'none',
                                        fill: '#31d0c6',
                                        r: 14,
                                    },
                                },
                            },
                        },
                        items: [
                            {
                                group: 'in',
                                attrs: { text: { text: 'in' } },
                                id: '3da4004a-938e-4b8d-aac7-94f93eded50a',
                            },
                            { group: 'out', id: 'yes', args: { y: 60 } },
                            { group: 'out', id: 'no', args: { y: 90 } },
                        ],
                    },
                    position: { x: 55, y: 245 },
                    size: { width: 195.65625, height: 135 },
                    angle: 0,
                    question: 'Did you mess about with it?',
                    inPorts: [{ id: 'in', label: 'In' }],
                    options: [
                        { id: 'yes', text: 'Yes' },
                        { id: 'no', text: 'No' },
                    ],
                    id: '22a1f5ae-c415-4927-bccc-403699971d88',
                    z: 2,
                    attrs: {
                        '.question-text': {
                            text: 'Did you mess about with it?',
                        },
                        '.options': { transform: 'translate(0, 45)' },
                        '.option-yes': {
                            transform: 'translate(0, 0)',
                            dynamic: true,
                        },
                        '.option-yes .option-rect': {
                            height: 30,
                            dynamic: true,
                        },
                        '.option-yes .option-text': {
                            text: 'Yes',
                            dynamic: true,
                            refY: 15,
                        },
                        '.option-no': {
                            transform: 'translate(0, 30)',
                            dynamic: true,
                        },
                        '.option-no .option-rect': {
                            height: 30,
                            dynamic: true,
                        },
                        '.option-no .option-text': {
                            text: 'No',
                            dynamic: true,
                            refY: 15,
                        },
                    },
                },
                {
                    type: 'qad.Question',
                    optionHeight: 30,
                    questionHeight: 45,
                    paddingBottom: 30,
                    minWidth: 150,
                    ports: {
                        groups: {
                            in: {
                                position: 'top',
                                attrs: {
                                    circle: {
                                        magnet: 'passive',
                                        stroke: 'white',
                                        fill: '#feb663',
                                        r: 14,
                                    },
                                    text: {
                                        pointerEvents: 'none',
                                        fontSize: 12,
                                        fill: 'white',
                                    },
                                },
                                label: {
                                    position: { name: 'left', args: { x: 5 } },
                                },
                            },
                            out: {
                                position: 'right',
                                attrs: {
                                    circle: {
                                        magnet: true,
                                        stroke: 'none',
                                        fill: '#31d0c6',
                                        r: 14,
                                    },
                                },
                            },
                        },
                        items: [
                            {
                                group: 'in',
                                attrs: { text: { text: 'in' } },
                                id: '17d84052-8cce-4357-89dc-92514c3a5cfe',
                            },
                            { group: 'out', id: 'yes', args: { y: 60 } },
                            { group: 'out', id: 'no', args: { y: 90 } },
                        ],
                    },
                    position: { x: 238, y: 429 },
                    size: { width: 155.625, height: 135 },
                    angle: 0,
                    question: 'Will you get screwed?',
                    inPorts: [{ id: 'in', label: 'In' }],
                    options: [
                        { id: 'yes', text: 'Yes' },
                        { id: 'no', text: 'No' },
                    ],
                    id: 'f473d963-30fb-4dd3-b51d-b3bd187391fc',
                    z: 3,
                    attrs: {
                        '.question-text': { text: 'Will you get screwed?' },
                        '.options': { transform: 'translate(0, 45)' },
                        '.option-yes': {
                            transform: 'translate(0, 0)',
                            dynamic: true,
                        },
                        '.option-yes .option-rect': {
                            height: 30,
                            dynamic: true,
                        },
                        '.option-yes .option-text': {
                            text: 'Yes',
                            dynamic: true,
                            refY: 15,
                        },
                        '.option-no': {
                            transform: 'translate(0, 30)',
                            dynamic: true,
                        },
                        '.option-no .option-rect': {
                            height: 30,
                            dynamic: true,
                        },
                        '.option-no .option-text': {
                            text: 'No',
                            dynamic: true,
                            refY: 15,
                        },
                    },
                },
                {
                    type: 'qad.Answer',
                    padding: 50,
                    position: { x: 464, y: 65 },
                    size: { width: 223.796875, height: 66.8 },
                    angle: 0,
                    answer: 'Don\'t mess about with it.',
                    id: '6d15cdcb-9981-4620-b023-b30d8f4f19d9',
                    z: 4,
                    attrs: { label: { text: 'Don\'t mess about with it.' } },
                },
                {
                    type: 'qad.Answer',
                    padding: 50,
                    position: { x: 343, y: 203 },
                    size: { width: 125.59375, height: 66.8 },
                    angle: 0,
                    answer: 'Run away!',
                    id: 'ef4e38b0-592b-415d-937f-75c74b969ad2',
                    z: 5,
                    attrs: { label: { text: 'Run away!' } },
                },
                {
                    type: 'qad.Answer',
                    padding: 50,
                    position: { x: 553, y: 400 },
                    size: { width: 117.296875, height: 66.8 },
                    angle: 0,
                    answer: 'Poor boy.',
                    id: '61b31adc-2640-4790-a46a-bcc736dba3b6',
                    z: 6,
                    attrs: { label: { text: 'Poor boy.' } },
                },
                {
                    type: 'qad.Answer',
                    padding: 50,
                    position: { x: 553, y: 524 },
                    size: { width: 146.953125, height: 66.8 },
                    angle: 0,
                    answer: 'Put it in a bin.',
                    id: 'dc726ad6-0dbc-4185-986d-82204a4bc77a',
                    z: 7,
                    attrs: { label: { text: 'Put it in a bin.' } },
                },
                {
                    type: 'standard.Link',
                    source: {
                        id: '41dd3458-88ec-4c64-a90c-1e2852dd2af5',
                        magnet: 'circle',
                        port: 'yes',
                    },
                    target: { id: '6d15cdcb-9981-4620-b023-b30d8f4f19d9' },
                    id: 'ccf980a7-30b1-4095-abd5-1c965049cf2f',
                    z: 8,
                    attrs: {
                        line: { stroke: '#6a6c8a', strokeWidth: 2 },
                    },
                },
                {
                    type: 'standard.Link',
                    source: {
                        id: '41dd3458-88ec-4c64-a90c-1e2852dd2af5',
                        magnet: 'circle',
                        port: 'no',
                    },
                    target: {
                        id: '22a1f5ae-c415-4927-bccc-403699971d88',
                        magnet: 'circle',
                        port: '3da4004a-938e-4b8d-aac7-94f93eded50a',
                    },
                    id: 'b25db08c-72c7-4e49-b16a-e20182997f72',
                    z: 9,
                    attrs: {
                        line: { stroke: '#6a6c8a', strokeWidth: 2 },
                    },
                },
                {
                    type: 'standard.Link',
                    source: {
                        id: '22a1f5ae-c415-4927-bccc-403699971d88',
                        magnet: 'circle',
                        port: 'yes',
                    },
                    target: { id: 'ef4e38b0-592b-415d-937f-75c74b969ad2' },
                    id: '774f37a6-7af0-4d9a-88d9-b8f784d945b9',
                    z: 10,
                    attrs: {
                        line: { stroke: '#6a6c8a', strokeWidth: 2 },
                    },
                },
                {
                    type: 'standard.Link',
                    source: {
                        id: '22a1f5ae-c415-4927-bccc-403699971d88',
                        magnet: 'circle',
                        port: 'no',
                    },
                    target: {
                        id: 'f473d963-30fb-4dd3-b51d-b3bd187391fc',
                        magnet: 'circle',
                        port: '17d84052-8cce-4357-89dc-92514c3a5cfe',
                    },
                    id: 'f9f09b39-66d9-4ff9-9de7-c3b7df5eed13',
                    z: 11,
                    attrs: {
                        line: { stroke: '#6a6c8a', strokeWidth: 2 },
                    },
                },
                {
                    type: 'standard.Link',
                    source: {
                        id: 'f473d963-30fb-4dd3-b51d-b3bd187391fc',
                        magnet: 'circle',
                        port: 'yes',
                    },
                    target: { id: '61b31adc-2640-4790-a46a-bcc736dba3b6' },
                    id: '4ff32e0f-9ed9-4461-97a3-745b05ec4447',
                    z: 12,
                    attrs: {
                        line: { stroke: '#6a6c8a', strokeWidth: 2 },
                    },
                },
                {
                    type: 'standard.Link',
                    source: {
                        id: 'f473d963-30fb-4dd3-b51d-b3bd187391fc',
                        magnet: 'circle',
                        port: 'no',
                    },
                    target: { id: 'dc726ad6-0dbc-4185-986d-82204a4bc77a' },
                    id: 'bb7a8254-675c-4366-8f64-8150d0afaa97',
                    z: 13,
                    attrs: {
                        line: { stroke: '#6a6c8a', strokeWidth: 2 },
                    },
                },
            ],
        });
    },
});
