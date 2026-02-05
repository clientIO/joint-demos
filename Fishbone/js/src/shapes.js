import { shapes, util, g } from '@joint/core';

const fontFamily = 'Arial';
const rootStyles = getComputedStyle(document.documentElement);

export function generateFishboneCells(data) {
    
    const elements = [];
    const links = [];
    
    function iterate(obj, pathArray = [], direction = null) {
        const { name = '', children = [] } = obj;
        const level = pathArray.length / 2;
        const node = createNode(name, level, direction);
        const id = 'node' + pathArray.map(item => typeof item === 'string' ? '-' : item).join('');
        node.set({
            id,
            level,
            path: pathArray,
            direction,
        });
        
        elements.push(node);
        
        if (!children)
            return node;
        
        // Distribute children to top and bottom automatically
        // Some of the directions may be explicitly set
        // in the data, so we need to count them first
        let topCount = 0;
        let bottomCount = 0;
        children.forEach((childObj) => {
            if (childObj.direction === 'top') {
                topCount++;
            }
            else if (childObj.direction === 'bottom') {
                bottomCount++;
            }
        });
        
        children.forEach((childObj, index) => {
            
            let nextDirection;
            let isExplicitDirection = false;
            if (level === 1) {
                if (childObj.direction) {
                    nextDirection = childObj.direction;
                    isExplicitDirection = true;
                }
                else {
                    nextDirection = (topCount <= bottomCount) ? 'top' : 'bottom';
                }
            }
            else {
                nextDirection = direction;
            }
            
            if (!isExplicitDirection) {
                // If it is explicitly set, we already counted it
                if (nextDirection === 'top') {
                    topCount++;
                }
                else {
                    bottomCount++;
                }
            }
            
            const childNode = iterate(childObj, pathArray.concat(['children', index]), nextDirection);
            childNode.set('order', index);
            links.push(new shapes.standard.Link({
                z: -1,
                id: `${node.id}_${childNode.id}`,
                source: { id: node.id },
                target: { id: childNode.id },
                attrs: {
                    root: {
                        pointerEvents: 'none',
                    },
                    line: {
                        targetMarker: null,
                        strokeWidth: Math.max(1, 12 - level * 3),
                        strokeLinecap: 'square'
                    }
                }
            }));
        });
        
        return node;
    }
    
    iterate(data);
    
    const cells = [...elements, ...links];
    return cells;
}

export function createNode(name, level, direction = 'bottom') {
    let node;
    switch (level) {
        case 0: {
            node = createHeadNode(name);
            break;
        }
        case 1: {
            node = createTailNode(name);
            break;
        }
        case 2: {
            node = createCauseNode(name);
            break;
        }
        case 3: {
            node = createEffectNode(name);
            break;
        }
        default: {
            if (level % 2 === 1) {
                node = createHorizontalSubCauseNode(name, level, direction);
            }
            else {
                node = createDiagonalSubCauseNode(name, level, direction);
            }
            break;
        }
    }
    node.attr('root', { cursor: 'pointer' });
    if (level >= 2) {
        // ignore the grand-children height
        node.set('compact', true);
    }
    
    return node;
}

function createHeadNode(name) {
    const textSize = measureTextSize(name, 22, fontFamily);
    const textMargin = 40;
    return new shapes.standard.Path({
        z: -1,
        size: {
            width: textSize.width * 1.25 + 2 * textMargin,
            height: Math.max(textSize.height + 2 * textMargin, 200)
        },
        attrs: {
            root: {
                highlighterSelector: 'bodyGroup'
            },
            body: {
                d: `
                    M 0 0 A calc(w) calc(h/2) 1 1 1 0 calc(h)
                    A calc(w/4) calc(h/2) 1 1 0 0 0
                    Z
                `,
                fill: '#333',
                strokeWidth: 3,
                strokeLinejoin: 'round',
            },
            label: {
                fontSize: 22,
                fontFamily,
                fill: '#fff',
                text: `${name}`,
                x: 'calc(5 * w / 8)',
            }
        },
        markup: util.svg /* html */ `
            <g @selector="bodyGroup" class="floating-group">
                <path @selector="body" />
                <text @selector="label" />
            </g>
        `,
    });
}

function createTailNode(name) {
    const textSize = measureTextSize(name, 22, fontFamily);
    const textMargin = 40;
    return new shapes.standard.Path({
        size: {
            width: textSize.width + 2 * textMargin,
            height: Math.max(textSize.height + 2 * textMargin, 160)
        },
        attrs: {
            root: {
                highlighterSelector: 'bodyGroup'
            },
            body: {
                d: 'M 0 0 A calc(w) calc(h/2) 1 1 1 0 calc(h) L 20 calc(h/2) Z',
                fill: '#333',
                strokeWidth: 3,
            },
            label: {
                fontSize: 20,
                fontFamily,
                fill: '#fff',
                text: `${name}`,
            }
        },
        markup: util.svg /* html */ `
            <g @selector="bodyGroup" class="floating-group">
                <path @selector="body" />
                <text @selector="label" />
            </g>
        `,
    });
}

function createCauseNode(name) {
    const fontSize = 16;
    const textSize = measureTextSize(name, fontSize, fontFamily);
    const textMargin = 20;
    return new shapes.standard.Ellipse({
        size: {
            width: textSize.width + 2 * textMargin,
            height: textSize.height + 2 * textMargin
        },
        markup: util.svg /* html */ `
            <ellipse @selector="shadow" />
            <g class="floating-group">
                <ellipse @selector="body" />
                <text @selector="label" />
            </g>
        `,
        attrs: {
            root: {
                highlighterSelector: 'root'
            },
            body: {
                strokeWidth: 3,
            },
            label: {
                fontSize,
                fontFamily,
                text: `${name}`,
            },
            shadow: {
                cx: 'calc(w / 2 + 3)',
                cy: 'calc(h / 2 + 5)',
                rx: 'calc(w / 2)',
                ry: 'calc(h / 2)',
                fill: '#333',
            }
        }
    });
}

function createEffectNode(name) {
    const textSize = measureTextSize(name, 14, fontFamily);
    const textMargin = Number.parseFloat(rootStyles.getPropertyValue('--text-margin'));
    
    return new shapes.standard.Rectangle({
        size: {
            width: textSize.width + 2 * textMargin,
            height: textSize.height + 2 * textMargin
        },
        markup: util.svg /* html */ `
                        <rect @selector="shadow" />
                        <g class="floating-group">
                            <rect @selector="body" />
                            <text @selector="label" />
                        </g>
                    `,
        attrs: {
            root: {
                highlighterSelector: 'root'
            },
            body: {
                rx: 5,
                ry: 5,
                stroke: '#333',
            },
            shadow: {
                x: 3,
                y: 3,
                width: `calc(w)`,
                height: `calc(h)`,
                rx: 5,
                ry: 5,
                fill: '#333',
                strokeWidth: 3,
            },
            label: {
                fontSize: 14,
                fontFamily,
                text: `${name}`,
            }
        }
    });
}



function createHorizontalSubCauseNode(name, _level, _direction) {
    const fontSize = 10;
    const textSize = measureTextSize(name, fontSize, fontFamily);
    const textMargin = Number.parseFloat(rootStyles.getPropertyValue('--text-margin'));
    
    return new shapes.standard.Rectangle({
        size: {
            width: textSize.width + 2 * textMargin,
            height: textSize.height + 2 * textMargin
        },
        attrs: {
            root: {
                highlighterSelector: 'label'
            },
            body: {
                stroke: 'none',
                fill: 'none',
            },
            label: {
                fontSize,
                fontFamily,
                text: `${name}`,
                paintOrder: 'stroke',
                stroke: '#fff',
                class: 'label-shift'
            }
        }
    });
}

function createDiagonalSubCauseNode(name, _level, direction) {
    const slope = Number.parseFloat(rootStyles.getPropertyValue('--slope'));
    const textMargin = Number.parseFloat(rootStyles.getPropertyValue('--text-margin'));
    const fontSize = 12;
    const textSize = measureTextSize(name, fontSize, fontFamily);
    const textOffset = 15;
    
    const width = textSize.height + 2 * textMargin;
    const height = Math.cos(g.toRad(slope)) * (textSize.width + 2 * textMargin) + 2 * textOffset;
    
    const groupClass = direction === 'top' ? 'label-shift-top' : 'label-shift-bottom';
    
    return new shapes.standard.Rectangle({
        size: {
            width,
            height
        },
        markup: util.svg /* html */ `
            <g @selector="labelGroup" class="${groupClass}">
                <text @selector="label" />
            </g>
        `,
        attrs: {
            root: {
                highlighterSelector: 'labelGroup'
            },
            label: {
                fontSize,
                fontFamily,
                text: `${name}`,
                paintOrder: 'stroke',
                stroke: '#fff',
                x: width / 2,
                y: direction === 'top' ? height : 0,
                textAnchor: 'end'
            }
        }
    });
}

// Utils

const canvas = document.createElement('canvas');
const canvasCtx = canvas.getContext('2d');

function measureTextSize(text, fontSize, fontFamily) {
    if (!canvasCtx) {
        return { width: 0, height: 0 };
    }
    canvasCtx.font = `${fontSize}px ${fontFamily}`;
    const lines = text.split('\n');
    const maxWidth = Math.max(...lines.map(line => canvasCtx.measureText(line).width));
    const lineHeight = lines.length * (fontSize * 1.2); // 1.2 is a common line height multiplier
    return {
        width: maxWidth,
        height: lineHeight
    };
}
