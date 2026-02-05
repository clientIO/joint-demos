import type { g } from '@joint/plus';
import { dia, ui, layout, V, elementTools, util } from '@joint/plus';
import type { Operator } from './models';
import { DurationNumberInput } from './highlighters/duration-number-input';
import { DurationHandle } from './tools/duration-handle';
import { TaskElement, TaskElementView } from './shapes/task-element';
import { BottomElement } from './shapes/bottom-element';

export interface Yamazumi3DOptions {
    paper: dia.Paper;
    topLeft: g.PlainPoint;
    height: number;
    operators: Operator[];
    maxDuration?: number;
    minDuration?: number;
    taskWidth?: number;
    taskDepth?: number;
}

export class Yamazumi3D {
    durationHeight: number;
    topLeft: g.PlainPoint;
    height: number;
    maxDuration: number;
    minDuration: number;
    operators: Operator[];
    taskWidth: number;
    taskDepth: number;
    operationGap: number;
    legendOffset: number;

    taktColor: string;
    paper: dia.Paper;
    topY: number;
    invalidDurationElement: V;
    layoutView: ui.StackLayoutView;

    constructor(options: Yamazumi3DOptions) {
        this.topLeft = options.topLeft;
        this.operators = options.operators;
        this.paper = options.paper;
        this.height = options.height;
        this.maxDuration = options.maxDuration || 60;
        this.minDuration = options.minDuration || 4;
        this.taskWidth = options.taskWidth || 200;
        this.taskDepth = options.taskDepth || 20;
        this.taktColor = '#ED2637';

        this.operationGap = 10;
        this.durationHeight = (this.height - this.taskDepth) / this.maxDuration;
        this.topY = this.topLeft.y + this.height - this.maxDuration * (this.durationHeight) - this.taskDepth;
        this.legendOffset = 15;

        this.createOperators();

        const layoutOptions: ui.StackLayoutView.StackLayoutModelOptions = {
            direction: layout.StackLayout.Directions.BottomTop,
            bottomLeft: {
                x: this.topLeft.x,
                y: this.topLeft.y + this.height
            },
            stackCount: this.operators.length,
            stackSize: this.taskWidth,
            stackGap: this.operationGap,
            stackElementGap: 0,
            setAttributes: (el, { position }) => {
                el.set({
                    position,
                    // Don't show animation when disableAnimation is set
                    animation: this.paper.model.get('animationDisabled') ? false : (position.x === el.position().x)
                });
            }
        };

        this.layoutView = new ui.StackLayoutView({
            layoutOptions: layoutOptions,
            paper: this.paper,
            canInteract: (elementView) => {
                return elementView instanceof TaskElementView;
            },
            preview: (data, view) => {
                const { targetStack, invalid } = data;
                const size = targetStack.bbox.width - view.model.get('stackGap') - 10;
                let color = '#43D200';
                const layerNode = this.paper.getLayerView(dia.Paper.Layers.BACK).el;
                if (this.invalidDurationElement) {
                    this.invalidDurationElement.remove();
                    delete this.invalidDurationElement;
                }
                if (invalid) {
                    color = 'red';
                    this.invalidDurationElement = V(/* xml */`
                    <g transform="translate(${targetStack.bbox.x + targetStack.bbox.width / 2 - 22}, ${this.topLeft.y + this.height + 45})">
                        <g>
                            <circle fill="${this.taktColor}" r="8"></circle>
                            <path transform="translate(-2,-6)" d="M1.91878 12L1.91162 11.9996C1.90912 11.9996 1.90697 12 1.90446 12C1.17203 12 0.578132 11.4065 0.578132 10.6737C0.578132 9.94159 1.17203 9.34805 1.90446 9.34805C1.90697 9.34805 1.90912 9.34805 1.91162 9.34805H1.91878C2.65086 9.34805 3.24547 9.94159 3.24547 10.6737C3.24547 11.4061 2.65194 12 1.91878 12ZM3.82076 1.89302C3.73412 3.21649 3.12913 7.15253 3.12913 7.15253C3.12913 7.81623 2.58535 8.35393 1.92165 8.35393C1.91807 8.35393 1.91449 8.35393 1.91127 8.35393C1.90804 8.35393 1.90411 8.35393 1.90088 8.35393C1.23754 8.35393 0.69376 7.81552 0.69376 7.15253C0.69376 7.15253 0.0891242 3.21649 0.00249192 1.89302C-0.0404662 1.23039 0.467156 0 1.90124 0C1.90482 0 1.9084 0.000358013 1.91162 0.000358013C1.91485 0.000358013 1.91843 0 1.92201 0C3.35573 0 3.86407 1.23039 3.82076 1.89302Z" fill="white"/>
                        </g>
                        <g transform="translate(15,-9)">
                            <rect fill="${this.taktColor}" rx="6" width="64" height="18"></rect>
                            <text transform="translate(32,11)" class="jj-yamazumi-error-text">limit reached</text>
                        </g>
                    </g>`).appendTo(layerNode);
                }

                const preview: V = V('path', {
                    'class': 'jj-yamazumi-preview-line',
                    'stroke': color,
                    'd': `M ${-size / 2} 0 h ${size} l ${this.taskDepth} ${-this.taskDepth}`
                });

                return preview.node;
            },
            validateMoving: (data) => {
                if (data.targetStack !== data.sourceStack) {
                    const totalDuration = data.targetStack.elements.reduce((agg, el) => agg + el.get('duration'), 0);
                    if (totalDuration + data.sourceElement.get('duration') > this.maxDuration) {
                        return false;
                    }
                }
                return true;
            }
        });

        this.layoutView.dragend = (element: dia.Element, x: number, y: number) => {
            ui.StackLayoutView.prototype.dragend.call(this.layoutView, element, x, y);
            if (this.invalidDurationElement) {
                this.invalidDurationElement.remove();
                delete this.invalidDurationElement;
            }
        };

        this.layoutView.model.on('update', () => {
            this.layoutView.model.stacks.forEach((st, i) => {
                st.elements.forEach((el, j) => {
                    el.set('z', i * 100 + j);
                });
            });
        });

        // Update leyout when size of the taskElement is changed
        this.paper.model.on('change:size', () => this.layoutView.model.update());

        this.drawTakt();
        this.drawYAxis();

        this.paper.on('element:mouseenter', (view: dia.ElementView) => {
            if (!(view.model instanceof TaskElement))
                return;

            this.paper.removeTools();

            view.model.set('active', true);
            const color = view.model.get('topColor');
            const textColor = view.model.get('labelColor');

            const toolsView = new dia.ToolsView({
                tools: [
                    new elementTools.Boundary({
                        useModelGeometry: true,
                        padding: { bottom: -1 },
                        attributes: {
                            stroke: 'white',
                            fill: 'none'
                        }
                    }),
                    new elementTools.Button({
                        markup: util.svg/* xml */`
                            <circle @selector="button" r="10" fill="${color}" stroke-width="1" stroke="white" cursor="pointer"/>
                            <g transform="translate(-6,-5)" opacity="0.5" fill="${textColor}" cursor="pointer">
                                <path d="M2.46436 1.89331L3.01573 8.84843C3.06828 9.49816 3.61127 10.0088 4.23199 10.0073L7.41148 9.99977C8.0322 9.9983 8.571 9.48514 8.61824 8.83518L9.11473 1.87758L2.46436 1.89331ZM4.50373 9.10285C4.5103 9.2448 4.40298 9.35703 4.26526 9.35736C4.12754 9.35768 4.01132 9.24398 4.00276 9.10404L3.68711 3.17413C3.67634 2.9822 3.79945 2.82594 3.96112 2.82556C4.12279 2.82518 4.25915 2.98082 4.26792 3.17275L4.50373 9.10285ZM6.06853 9.09915C6.06911 9.24112 5.9558 9.35336 5.82008 9.35368C5.68435 9.354 5.57012 9.2403 5.56955 9.10033L5.50538 3.16983C5.5026 2.97788 5.6317 2.82161 5.79337 2.82122C5.95504 2.82084 6.08541 2.9765 6.0842 3.16846L6.06853 9.09915ZM7.63332 9.09545C7.62791 9.23743 7.51061 9.34968 7.37289 9.35001C7.23518 9.35033 7.12893 9.23661 7.13235 9.09663L7.31966 3.16553C7.32487 2.97357 7.46195 2.81728 7.62362 2.81689C7.78528 2.81651 7.90967 2.97218 7.90047 3.16416L7.63332 9.09545Z"/>
                                <path d="M9.57444 1.53931L2.00964 1.5573C1.97195 1.1327 2.22029 0.783907 2.56397 0.78309L9.01583 0.767744C9.3575 0.766931 9.60869 1.11655 9.57444 1.53931Z"/>
                                <path d="M7.15587 1.05864L4.42723 1.0651L4.4226 0.908938C4.40461 0.418442 4.71057 0.0112713 5.10609 0.0103352L6.47041 0.00710629C6.86392 0.00617496 7.17321 0.411889 7.16122 0.900454L7.15587 1.05864Z"/>
                            </g>
                        `,
                        x: 0,
                        y: 0,
                        offset: {
                            x: 0,
                            y: 0
                        },
                        useModelGeometry: true,
                        action: () => {
                            this.paper.model.removeCells([view.model]);
                            this.layoutView.model.update();
                        }
                    }),
                    new DurationHandle({
                        durationHeight: this.durationHeight,
                        maxDuration: this.maxDuration,
                        minDuration: this.minDuration,
                        layout: this.layoutView,
                        color
                    })
                ]
            });
            view.addTools(toolsView);
        });

        this.paper.on('element:mouseleave', (view: dia.ElementView) => {
            if (!(view.model instanceof TaskElement))
                return;

            if (!view.model.get('focused')) {
                view.model.set('active', false);
            }
            view.model.set('hovered', false);
            view.removeTools();
        });

        this.paper.model.getCells().forEach(el => {
            if (el instanceof TaskElement) {
                DurationNumberInput.add(el.findView(this.paper), 'front', 'duration-number-input', {
                    layoutView: this.layoutView,
                    maxDuration: this.maxDuration,
                    minDuration: this.minDuration
                });
            }
        });
    }

    protected createOperators() {
        const graph = this.paper.model;

        const bottomElement = new BottomElement({
            frontColor: '#C1CFDA',
            sideColor: '#BBBBBB',
            topColor: '#D8E0E6',
            depth: this.taskDepth,
            position: {
                x: this.topLeft.x + this.operationGap,
                y: this.topLeft.y + this.height
            },
            operators: this.operators,
            operationGap: this.operationGap,
            taskWidth: this.taskWidth
        });

        graph.addCell(bottomElement);

        this.operators.forEach((operator, operatorIndex) => {
            const { tasks } = operator;
            tasks.forEach((task, taskIndex) => {
                const taskElement = new TaskElement({
                    ...task,
                    durationHeight: this.durationHeight,
                    stackIndex: operatorIndex,
                    stackElementIndex: taskIndex,
                    depth: this.taskDepth,
                });
                graph.addCell(taskElement);
            });
        });
    }

    protected drawYAxis(): V {
        const y = this.topLeft.y + this.height;
        const x = this.topLeft.x - this.legendOffset;
        const layerNode = this.paper.getLayerView(dia.Paper.Layers.BACK).el;
        const axis = V('g');
        let currentY = y;
        let duration = 0;
        while (currentY > this.topLeft.y) {
            V('path', {
                'class': 'jj-yamazumi-legend-line',
                'd': `M ${x} ${currentY} h 10`
            }).appendTo(axis);
            if (duration !== 0) {
                const textEl = V('text', {
                    'class': 'jj-yamazumi-legend-text',
                    'transform': `translate(${x - 35}, ${currentY - 7})`,
                    'alignment-baseline': 'middle'
                });
                textEl.text(`${duration} h`);
                textEl.appendTo(axis);
            }
            currentY -= this.durationHeight * 10;
            duration += 10;
        }
        V('path', {
            'class': 'jj-yamazumi-legend-line',
            'd': `M ${x} ${y} V ${this.topLeft.y + this.height - this.maxDuration * this.durationHeight}`
        }).appendTo(axis);
        axis.appendTo(layerNode);
        return axis;
    }

    protected drawTakt(): V {
        const y = this.topLeft.y + this.taskDepth;
        const x = this.topLeft.x - this.legendOffset;
        const layerNode = this.paper.getLayerView(dia.Paper.Layers.FRONT).el;
        return V('path', {
            'class': 'jj-yamazumi-takt',
            'stroke': this.taktColor,
            'd': `M ${x} ${y} l ${this.taskDepth} ${-this.taskDepth} h ${this.operators.length * this.taskWidth + this.operationGap + this.legendOffset + 10}`
        }).appendTo(layerNode);
    }
}
