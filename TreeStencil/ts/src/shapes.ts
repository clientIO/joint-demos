import type { Vectorizer } from '@joint/plus';
import { dia, shapes, g } from '@joint/plus';

const WIDTH = 80;
const HEIGHT = 20;

export class StencilNode extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'app.StencilNode',
            hidden: false,
            collapsed: false,
            matched: false,
            z: 2,
            size: {
                width: WIDTH,
                height: HEIGHT
            },
            path: [] as Array<string>,
            attrs: {
                root: {
                    cursor: 'move'
                },
                body: {
                    ref: 'label',
                    width: 'calc(w + 6)',
                    height: 'calc(h + 6)',
                    x: 'calc(x - 3)',
                    y: 'calc(y - 3)',
                    fill: 'transparent'
                },
                label: {
                    x: 25,
                    y: 'calc(0.5 * h)',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'start',
                    fontSize: 13,
                    fontFamily: 'sans-serif'
                },
                icon: {
                    width: 20,
                    height: 20,
                },
                buttonGroup: {
                    transform: 'translate(-15, calc(0.5 * h))'
                },
                button: {
                    fill: '#FFFFFF',
                    stroke: '#808080',
                    x: -5,
                    y: -5,
                    height: 10,
                    width: 10,
                    cursor: 'pointer',
                    event: 'element:collapse',
                },
                buttonSign: {
                    transform: 'translate(-5, -5)',
                    stroke: '#808080',
                    strokeWidth: 1.6
                }
            }
        };
    }
    PLUS_SIGN = 'M 1 5 9 5 M 5 1 5 9';
    MINUS_SIGN = 'M 2 5 8 5';

    markup = [{
        tagName: 'rect',
        selector: 'body',
    }, {
        tagName: 'text',
        selector: 'label'
    }, {
        tagName: 'image',
        selector: 'icon'
    }, {
        tagName: 'g',
        selector: 'buttonGroup',
        children: [{
            tagName: 'rect',
            selector: 'button'
        }, {
            tagName: 'path',
            selector: 'buttonSign',
            attributes: {
                'fill': 'none',
                'pointer-events': 'none'
            }
        }]
    }];
    setIcon(icon: string): StencilNode {
        return this.attr(['icon', 'xlinkHref'], icon);
    }
    isHidden(): boolean {
        return Boolean(this.get('hidden'));
    }
    isCollapsed(): boolean {
        return Boolean(this.get('collapsed'));
    }
    isMatched(): boolean {
        return Boolean(this.get('matched'));
    }
    isDirectory(): boolean {
        return Boolean(this.get('dir'));
    }
    toggleButtonVisibility(visible: boolean): StencilNode {
        return this.attr('buttonGroup', { display: visible ? 'block' : 'none' });
    }
    toggleButtonSign(collapse: boolean): StencilNode {
        return this.attr('buttonSign', { d: collapse ? this.MINUS_SIGN : this.PLUS_SIGN });
    }
    getPathString(separator = '/'): string {
        return this.get('path').join(separator);
    }
    match(keyword: string): void {

        // Set path value as label and annotate text

        const name = this.get('name');
        const displayName = this.getPathString(' / ');

        const annotations: Array<Vectorizer.TextAnnotation> = [{
            // Bold Node Name
            start: 0,
            end: displayName.length - name.length,
            attrs: {
                'fill': '#999'
            }
        }];

        const matchIndex = displayName.toLowerCase().lastIndexOf(keyword.toLowerCase());
        if (matchIndex > -1) {
            annotations.push({
                // Underlined Keyword
                start: matchIndex,
                end: matchIndex + keyword.length,
                attrs: {
                    'text-decoration': 'underline'
                }
            });
        }

        this.toggleButtonVisibility(false);
        this.prop({
            matched: true,
            attrs: {
                label: {
                    text: displayName,
                    annotations
                }
            }
        });
    }
    unmatch(): void {
        this.prop({
            matched: false,
            attrs: {
                label: {
                    text: this.get('name'),
                    annotations: null
                }
            }
        });
    }
}

export class StencilLink extends dia.Link {
    defaults() {
        return {
            ...super.defaults,
            type: 'app.StencilLink',
            z: 1,
            router: (_vertices: Array<g.Point>, _opt: object, linkView: dia.LinkView) => {
                const { x } = linkView.getEndAnchor('source');
                const { y } = linkView.getEndAnchor('target');
                return [new g.Point(x, y)];
            },
            attrs: {
                root: {
                    pointerEvents: 'none'
                },
                line: {
                    connection: true,
                    stroke: '#C0C0C0',
                    strokeWidth: 1,
                    shapeRendering: 'optimizeSpeed',
                    vertexMarker: {
                        type: 'circle',
                        r: 1
                    }
                }
            }
        };
    }
    markup = [{
        tagName: 'path',
        selector: 'line',
        attributes: {
            'fill': 'none',
        }
    }];
    connect(parentId: string, childId: string): void {
        this.set({
            source: {
                id: parentId,
                anchor: {
                    name: 'modelCenter',
                    args: {
                        dx: - (WIDTH / 2) + 5,
                        dy: HEIGHT / 2
                    }
                }
            },
            target: {
                id: childId,
                anchor: {
                    name: 'modelCenter',
                    args: { dx: - (WIDTH / 2) }
                }
            }
        });
    }
    isHidden(): boolean {
        // If the target element is collapsed, we don't want to
        // show the link either
        const targetElement = this.getTargetElement() as StencilNode;
        return !targetElement || targetElement.isHidden();
    }
}

Object.assign(shapes, {
    app: {
        StencilNode,
        StencilLink
    }
});
