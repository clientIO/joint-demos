import { dia, elementTools, linkTools, highlighters } from '@joint/core';

import { graph, paper } from './app';
import { provider, localUser, isInteractionBlocked, isEditingName, setCursorPosition, setEditingCell } from './collaboration';
import { TextBox } from './shapes/text-box';

let activeEditor: HTMLElement | null = null;
let activeLinkView: dia.LinkView | null = null;

const removeLinkTools = () => {
    activeLinkView?.removeTools();
    activeLinkView = null;
};

export function init() {

    paper.on('blank:pointerdblclick', (_evt, x, y) => {
        if (isEditingName()) return;
        const box = new TextBox({
            position: { x: x - 40, y: y - 20 },
            attrs: { label: { text: 'New box' }},
        });
        graph.addCell(box);
    });

    paper.on('element:pointerdblclick', (elementView) => {
        const cell = elementView.model as dia.Element;
        if (isInteractionBlocked(cell.id)) return;
        startEditing(cell);
    });

    paper.on('link:pointerdown', (linkView, evt, x, y) => {
        removeLinkTools();
        highlighters.mask.removeAll(paper, 'label-selection');
        if (isInteractionBlocked(linkView.model.id)) return;
        const labelEl = (evt.target as Element).closest('.label') as SVGElement | null;
        if (labelEl) {
            const bodyEl = (labelEl.querySelector('[joint-selector="labelBody"]') as SVGElement) ?? labelEl;
            highlighters.mask.add(linkView, bodyEl, 'label-selection', {
                attrs: { stroke: localUser.color, strokeWidth: 2 },
            });
        } else {
            activeLinkView = linkView;
            linkView.addTools(new dia.ToolsView({
                tools: [
                    new linkTools.Remove({
                        distance: linkView.getClosestPointLength({ x, y }),
                        offset: -20,
                        markup: [{
                            tagName: 'circle',
                            selector: 'button',
                            attributes: {
                                r: 10,
                                fill: 'white',
                                stroke: '#e74c3c',
                                'stroke-width': 1.5,
                                cursor: 'pointer',
                            },
                        }, {
                            tagName: 'path',
                            selector: 'icon',
                            attributes: {
                                d: 'M -3.5 -3.5 3.5 3.5 M -3.5 3.5 3.5 -3.5',
                                fill: 'none',
                                stroke: '#e74c3c',
                                'stroke-width': 2,
                                'stroke-linecap': 'round',
                                'pointer-events': 'none',
                            },
                        }],
                    }),
                ],
            }));
        }
    });

    paper.on('link:pointerdblclick', (linkView, evt, x, y) => {
        const link = linkView.model as dia.Link;
        if (isInteractionBlocked(link.id)) return;
        const labelEl = (evt.target as Element).closest('.label');
        if (labelEl) {
            const labelIndex = parseInt(labelEl.getAttribute('label-idx') ?? '', 10);
            if (isNaN(labelIndex)) return;
            startLabelEditing(link, labelIndex, labelEl);
        } else {
            const ratio = linkView.getClosestPointRatio({ x, y });
            const labelIndex = link.labels().length;
            link.insertLabel(labelIndex, {
                position: ratio,
                attrs: { labelText: { text: '' }},
            });
            requestAnimationFrame(() => {
                const newLabelEl = linkView.el.querySelector(`.label[label-idx="${labelIndex}"]`);
                if (newLabelEl) startLabelEditing(link, labelIndex, newLabelEl);
            });
        }
    });

    paper.on('element:mouseenter', (elementView) => {
        if (isInteractionBlocked(elementView.model.id)) return;
        elementView.addTools(
            new dia.ToolsView({
                tools: [
                    new elementTools.Connect({
                        x: 'calc(w)',
                        y: 'calc(h / 2 + 10)',
                        markup: [{
                            tagName: 'circle',
                            selector: 'button',
                            attributes: {
                                r: 10,
                                fill: 'white',
                                stroke: '#333',
                                'stroke-width': 1.5,
                                cursor: 'pointer',
                            },
                        }, {
                            tagName: 'path',
                            selector: 'icon',
                            attributes: {
                                d: 'M -4 -1 L 0 -1 L 0 -4 L 4 0 L 0 4 L 0 1 L -4 1 Z',
                                fill: '#333',
                                'pointer-events': 'none',
                            },
                        }],
                    }),
                    new elementTools.Remove({
                        markup: [{
                            tagName: 'circle',
                            selector: 'button',
                            attributes: {
                                r: 10,
                                fill: 'white',
                                stroke: '#e74c3c',
                                'stroke-width': 1.5,
                                cursor: 'pointer',
                            },
                        }, {
                            tagName: 'path',
                            selector: 'icon',
                            attributes: {
                                d: 'M -3.5 -3.5 3.5 3.5 M -3.5 3.5 3.5 -3.5',
                                fill: 'none',
                                stroke: '#e74c3c',
                                'stroke-width': 2,
                                'stroke-linecap': 'round',
                                'pointer-events': 'none',
                            },
                        }],
                    }),
                ],
            })
        );
    });

    paper.on('element:mouseleave', (elementView) => {
        elementView.removeTools();
    });

    paper.el.addEventListener('mousemove', (evt) => {
        const { x, y } = paper.clientToLocalPoint(evt.clientX, evt.clientY);
        setCursorPosition(x, y);
    });

    paper.el.addEventListener('mouseleave', () => {
        provider.awareness.setLocalStateField('cursor', null);
    });

    paper.on('cell:pointerdown', (cellView, evt) => {
        if (!cellView.model.isLink()) {
            highlighters.mask.removeAll(paper, 'label-selection');
            removeLinkTools();
        }
        activeEditor?.blur();
        if (isInteractionBlocked(cellView.model.id)) {
            cellView.preventDefaultInteraction(evt);
            return;
        }
        const isLabelClick = cellView.model.isLink() && !!(evt.target as Element).closest('.label');
        if (isLabelClick) return;
        provider.awareness.setLocalStateField('selection', [cellView.model.id]);
    });

    paper.on('blank:pointerdown', () => {
        removeLinkTools();
        highlighters.mask.removeAll(paper, 'label-selection');
        provider.awareness.setLocalStateField('selection', []);
        activeEditor?.blur();
    });

}

function startEditing(cell: dia.Element) {
    const { x, y } = cell.position();
    const { width, height } = cell.size();
    const topLeft = paper.localToClientPoint(x, y);
    const bottomRight = paper.localToClientPoint(x + width, y + height);

    setEditingCell(cell.id);
    provider.awareness.setLocalStateField('selection', []);

    const wrapper = document.createElement('div');
    const editor = document.createElement('div');
    activeEditor = editor;
    editor.contentEditable = 'true';
    editor.spellcheck = false;
    editor.textContent = (cell.attr('label/text') as string) || '';

    const centerX = (topLeft.x + bottomRight.x) / 2;
    const centerY = (topLeft.y + bottomRight.y) / 2;
    const minWidth = bottomRight.x - topLeft.x;
    const minHeight = bottomRight.y - topLeft.y;

    Object.assign(wrapper.style, {
        position: 'fixed',
        left: `${centerX}px`,
        top: `${centerY}px`,
        transform: 'translate(-50%, -50%)',
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`,
        zIndex: '100',
        border: `2px solid ${localUser.color}`,
        borderRadius: '2px',
        background: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
    });

    const fontSize = cell.attr('label/fontSize') ?? 14;
    const textWrap = cell.attr('label/textWrap') as { width?: number; height?: number } | undefined;
    const { sx, sy } = paper.scale();
    const paddingH = textWrap?.width != null && textWrap.width < 0 ? (Math.abs(textWrap.width) / 2) * sx : 8;
    const paddingV = textWrap?.height != null && textWrap.height < 0 ? (Math.abs(textWrap.height) / 2) * sy : 4;

    Object.assign(editor.style, {
        outline: 'none',
        textAlign: 'center',
        fontFamily: 'sans-serif',
        fontSize: `${fontSize}px`,
        padding: `${paddingV}px ${paddingH}px`,
        wordBreak: 'break-word',
    });

    wrapper.appendChild(editor);
    document.body.appendChild(wrapper);

    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    let done = false;

    function commit() {
        if (done) return;
        done = true;
        cell.attr('label/text', editor.textContent?.trim() ?? '');
        cleanup();
    }

    function cancel() {
        if (done) return;
        done = true;
        cleanup();
    }

    function cleanup() {
        activeEditor = null;
        setEditingCell(null);
        wrapper.remove();
    }

    editor.addEventListener('blur', commit);

    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            cancel();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            commit();
        }
    });
}

function startLabelEditing(link: dia.Link, labelIndex: number, labelGroupEl: Element) {
    const bodyEl = labelGroupEl.querySelector('[joint-selector="labelBody"]');
    const rect = (bodyEl ?? labelGroupEl).getBoundingClientRect();

    highlighters.mask.removeAll(paper, 'label-selection');
    setEditingCell(link.id);
    provider.awareness.setLocalStateField('selection', []);

    const wrapper = document.createElement('div');
    const editor = document.createElement('div');
    activeEditor = editor;
    editor.contentEditable = 'true';
    editor.spellcheck = false;
    editor.textContent = (link.label(labelIndex).attrs?.['labelText']?.text as string) ?? '';

    Object.assign(wrapper.style, {
        position: 'fixed',
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: 'translate(-50%, -50%)',
        minWidth: `${rect.width}px`,
        minHeight: `${rect.height}px`,
        zIndex: '100',
        border: `2px solid ${localUser.color}`,
        borderRadius: '2px',
        background: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
    });

    Object.assign(editor.style, {
        outline: 'none',
        textAlign: 'center',
        fontFamily: 'sans-serif',
        fontSize: '12px',
        padding: '2px 8px',
        wordBreak: 'break-word',
    });

    wrapper.appendChild(editor);
    document.body.appendChild(wrapper);

    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    let done = false;

    function commit() {
        if (done) return;
        done = true;
        const text = editor.textContent?.trim() ?? '';
        if (text) {
            link.label(labelIndex, { attrs: { labelText: { text }}});
        } else {
            link.removeLabel(labelIndex);
        }
        cleanup();
    }

    function cancel() {
        if (done) return;
        done = true;
        cleanup();
    }

    function cleanup() {
        activeEditor = null;
        setEditingCell(null);
        wrapper.remove();
    }

    editor.addEventListener('blur', commit);

    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            cancel();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            commit();
        }
    });
}
