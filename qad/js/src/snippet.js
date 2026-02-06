/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

var qad = window.qad || {};

qad.renderDialog = function(dialog, node) {

    this.dialog = dialog;

    if (!node) {

        for (var dNode of dialog.nodes) {

            if (dNode.id === dialog.root) {

                node = dNode;
                break;
            }
        }
    }

    if (!node) {

        throw new Error('It is not clear where to go next.');
    }

    if (!this.el) {
        this.el = this.createElement('div', 'qad-dialog');
    }

    // Empty previously rendered dialog.
    this.el.textContent = '';

    switch (node.type) {

        case 'qad.Question':
            this.renderQuestion(node);
            break;
        case 'qad.Answer':
            this.renderAnswer(node);
            break;
    }

    this.currentNode = node;

    return this.el;
};

qad.createElement = function(tagName, className) {

    var el = document.createElement(tagName);
    el.setAttribute('class', className);
    return el;
};

qad.renderOption = function(option) {

    var elOption = this.createElement('button', 'qad-option qad-button');
    elOption.textContent = option.text;
    elOption.setAttribute('data-option-id', option.id);

    var self = this;
    elOption.addEventListener('click', function(evt) {

        self.onOptionClick(evt);

    }, false);

    return elOption;
};

qad.renderQuestion = function(node) {

    var elContent = this.createElement('div', 'qad-content');
    var elOptions = this.createElement('div', 'qad-options');

    for (var nodeOption of node.options) {

        elOptions.appendChild(this.renderOption(nodeOption));
    }

    var elQuestion = this.createElement('h3', 'qad-question-header');
    elQuestion.innerHTML = node.question;

    elContent.appendChild(elQuestion);
    elContent.appendChild(elOptions);

    this.el.appendChild(elContent);
};

qad.renderAnswer = function(node) {

    var elContent = this.createElement('div', 'qad-content');
    var elAnswer = this.createElement('h3', 'qad-answer-header');
    elAnswer.innerHTML = node.answer;

    elContent.appendChild(elAnswer);
    this.el.appendChild(elContent);
};

qad.onOptionClick = function(evt) {

    var elOption = evt.target;
    var optionId = elOption.getAttribute('data-option-id');

    var outboundLink;
    for (var dLink of this.dialog.links) {

        if (dLink.source.id === this.currentNode.id && dLink.source.port === optionId) {

            outboundLink = dLink;
            break;
        }
    }

    if (outboundLink) {

        var nextNode;
        for (var dNode of this.dialog.nodes) {

            if (dNode.id === outboundLink.target.id) {

                nextNode = dNode;
                break;
            }
        }

        if (nextNode) {

            this.renderDialog(this.dialog, nextNode);
        }
    }
};
