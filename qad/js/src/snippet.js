let currentDialog = null;
let currentEl = null;
let currentNode = null;

export function renderDialog(dialog, node) {

    currentDialog = dialog;

    if (!node) {

        for (let dNode of currentDialog.nodes) {

            if (dNode.id === currentDialog.root) {

                node = dNode;
                break;
            }
        }
    }

    if (!node) {

        throw new Error('It is not clear where to go next.');
    }

    if (!currentEl) {
        currentEl = createElement('div', 'qad-dialog');
    }

    // Empty previously rendered dialog.
    currentEl.textContent = '';

    switch (node.type) {

        case 'qad.Question':
            renderQuestion(node);
            break;
        case 'qad.Answer':
            renderAnswer(node);
            break;
    }

    currentNode = node;

    return currentEl;
};

export function createElement(tagName, className) {

    const el = document.createElement(tagName);
    el.setAttribute('class', className);
    return el;
};

export function renderOption(option) {

    const elOption = createElement('button', 'qad-option qad-button');
    elOption.textContent = option.text;
    elOption.setAttribute('data-option-id', option.id);

    elOption.addEventListener('click', function(evt) {
        onOptionClick(evt);
    }, false);

    return elOption;
};

export function renderQuestion(node) {

    const elContent = createElement('div', 'qad-content');
    const elOptions = createElement('div', 'qad-options');

    for (const nodeOption of node.options) {

        elOptions.appendChild(renderOption(nodeOption));
    }

    const elQuestion = createElement('h3', 'qad-question-header');
    elQuestion.innerHTML = node.question;

    elContent.appendChild(elQuestion);
    elContent.appendChild(elOptions);

    currentEl.appendChild(elContent);
};

export function renderAnswer(node) {

    const elContent = createElement('div', 'qad-content');
    const elAnswer = createElement('h3', 'qad-answer-header');
    elAnswer.innerHTML = node.answer;

    elContent.appendChild(elAnswer);
    currentEl.appendChild(elContent);
};

export function onOptionClick(evt) {

    const elOption = evt.target;
    const optionId = elOption.getAttribute('data-option-id');

    let outboundLink;
    for (let dLink of currentDialog.links) {
        if (dLink.source.id === currentNode.id && dLink.source.port === optionId) {

            outboundLink = dLink;
            break;
        }
    }

    if (outboundLink) {

        let nextNode;
        for (let dNode of currentDialog.nodes) {

            if (dNode.id === outboundLink.target.id) {

                nextNode = dNode;
                break;
            }
        }

        if (nextNode) {

            renderDialog(currentDialog, nextNode);
        }
    }
};
