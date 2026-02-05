import { dia, elementTools, ui } from '@joint/plus';

export function addElementTools(cellView) {
    
    const { paper } = cellView;
    const cell = cellView.model;
    const padding = cell.getFramePadding();
    
    removeElementTools(paper);
    
    const freeTransform = new ui.FreeTransform({
        cellView,
        resizeGrid: cell.getResizeGrid(),
        allowRotation: false,
        padding,
        theme: 'material'
    });
    
    freeTransform.on({
        'resize:start': () => {
            cellView.addTools(new dia.ToolsView({ tools: [new SizeLabel()] }));
        },
        'resize:stop': () => {
            cellView.addTools(toolsView);
        }
    });
    
    const toolsView = new dia.ToolsView({
        tools: [
            new elementTools.Remove({
                x: '100%',
                offset: { x: padding.right + 14, y: -padding.top - 14 },
                useModelGeometry: true,
                markup: [{
                        tagName: 'circle',
                        selector: 'button',
                        attributes: {
                            'r': 10,
                            'fill': '#0058FF',
                            'cursor': 'pointer'
                        }
                    }, {
                        tagName: 'path',
                        selector: 'icon',
                        attributes: {
                            'd': 'M -4 -4 4 4 M -4 4 4 -4',
                            'fill': 'none',
                            'stroke': '#FFFFFF',
                            'stroke-width': 2,
                            'pointer-events': 'none'
                        }
                    }]
            })
        ]
    });
    
    freeTransform.render();
    cellView.addTools(toolsView);
}

export function removeElementTools(paper) {
    paper.removeTools();
    ui.FreeTransform.clear(paper);
}

const SizeLabelWidth = 50;
const SizeLabelHeight = 24;

export const SizeLabel = dia.ToolView.extend({
    
    children: [{
            tagName: 'rect',
            selector: 'background',
            attributes: {
                'width': SizeLabelWidth,
                'height': SizeLabelHeight,
                'x': -SizeLabelWidth / 2,
                'rx': 2,
                'ry': 2,
                'fill': '#fff',
                'stroke': '#333',
                'stroke-width': 2
            }
        }, {
            tagName: 'text',
            selector: 'label',
            attributes: {
                'text-anchor': 'middle',
                'x': 0,
                'y': 17,
                'font-size': 13,
                'font-family': 'Roboto',
                'fill': '#333',
            }
        }],
    
    onRender: function () {
        this.renderChildren();
        this.update();
    },
    
    update: function () {
        const { el: groupEl, relatedView } = this;
        const product = relatedView.model;
        const [/* rectEl */ , textEl] = groupEl.children;
        textEl.textContent = product.getCurrentSizeLabel();
        const bbox = product.getBBox();
        const { left, right, top, bottom } = product.getFramePadding();
        bbox.moveAndExpand({ x: -left, y: -top, width: left + right, height: top + bottom });
        groupEl.setAttribute('transform', `translate(${bbox.x + bbox.width / 2}, ${bbox.y - SizeLabelHeight - 5})`);
    }
});
