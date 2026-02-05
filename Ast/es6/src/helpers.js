import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, keymap } from '@codemirror/view';
import { EditorView, basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import presets from './presets';

export function getChildren(node) {
    
    switch (node.type) {
        
        case 'Program':
            return node.body;
        
        case 'VariableDeclaration':
            return node.declarations;
        
        case 'VariableDeclarator':
            return node.init ? [node.id, node.init] : [node.id];
        
        case 'ExpressionStatement':
            return [node.expression];
        
        case 'BinaryExpression':
            return [node.left, node.right];
        
        case 'AssignmentExpression':
            return [node.left, node.right];
        
        case 'CallExpression':
            return [node.callee, { type: 'arguments', arguments: node.arguments }];
        
        case 'arguments':
            return node.arguments;
        
        case 'MemberExpression':
            return [node.object, node.property];
        
        case 'NewExpression':
            return node.arguments;
        
        case 'ObjectExpression':
            return node.properties;
        
        case 'Property':
            return [node.key, node.value];
        
        case 'FunctionDeclaration':
            return [node.body];
        
        case 'FunctionExpression':
            return [node.body];
        
        case 'BlockStatement':
            return node.body;
        
        case 'ReturnStatement':
            return node.argument ? [node.argument] : [];
        
        case 'UnaryExpression':
            return [node.argument];
        
        case 'IfStatement':
            return [node.test, node.consequent];
        
        case 'ConditionalExpression':
            return [node.test, node.consequent, node.alternate];
        
        default:
            return [];
    }
}

export function getLabel(node) {
    
    switch (node.type) {
        
        case 'Identifier':
            return node.name;
        
        case 'Literal':
            return node.raw;
        
        case 'UnaryExpression':
            return node.operator;
        
        case 'BinaryExpression':
            return node.operator;
        
        case 'AssignmentExpression':
            return node.operator;
        
        case 'FunctionDeclaration':
        case 'FunctionExpression': {
            const params = node.params.map((param) => param.name).join(',');
            return 'function ' + (node.id && node.id.name || '') + '(' + params + ')';
        }
        default:
            return node.type;
    }
}

export function getElementColor(node) {
    
    const color = ({
        'Program': 'black',
        'VariableDeclarator': '#414141',
        'arguments': '#63c1f1',
        'BinaryExpression': '#fcbc2a',
        'UnaryExpression': '#fcbc2a',
        'AssignmentExpression': '#fcbc2a',
        'Identifier': '#ff5246',
        'Literal': '#77c63d'
    })[node.type];
    
    return color || '#232323';
}

export function addEventListenerToTokenList() {
    const tokenList = document.querySelectorAll('.stats-tokens li');
    
    tokenList.forEach(element => element.addEventListener('mouseover', tokenHover));
    tokenList.forEach(element => element.addEventListener('mouseout', unhighlightRange));
}

export function unhighlightRange() {
    editorView.dispatch({
        effects: filterMarks.of(null)
    });
}

export function highlightRange([start, end]) {
    if (start === end) {
        // Do not highlight a range of length 0
        return;
    }
    
    editorView.dispatch({
        effects: highlightMark.of([highlightDecoration.range(start, end)])
    });
}

function tokenHover(e) {
    const li = e.target;
    const range = JSON.parse(li.getAttribute('data-range'));
    unhighlightRange();
    highlightRange(range);
}

export function changePreset() {
    const preset = document.getElementById('select-program');
    const value = preset.value;
    const code = presets[value];
    editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: code }
    });
}

// codemirror
const highlightMark = StateEffect.define();
const filterMarks = StateEffect.define();

const markField = StateField.define({
    create() { return Decoration.none; },
    update(value, tr) {
        value = value.map(tr.changes);
        for (let effect of tr.effects) {
            if (effect.is(highlightMark))
                value = value.update({ add: effect.value, sort: true });
            else if (effect.is(filterMarks))
                value = value.update({ filter: () => false });
        }
        return value;
    },
    provide: f => EditorView.decorations.from(f)
});

const highlightDecoration = Decoration.mark({
    class: 'highlight',
});

export const editorView = new EditorView({
    extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        javascript(),
        markField
    ],
    parent: document.getElementById('program')
});
