import { dia, shapes, util, linkTools, elementTools, g } from '@joint/plus';

export const COLOR_PLUG_TEXT = '#3E697A';
export const COLOR_TERMINAL = '#8ACB88';
export const COLOR_TERMINAL_TEXT = '#C9F0FF';
export const COLOR_ROTATE = '#7209B7';
export const ICON_ROTATE = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${COLOR_ROTATE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
    </svg>
`;

export const RotateTool = elementTools.Control.extend({
    children: [
        {
            tagName: 'image',
            selector: 'handle',
            attributes: {
                cursor: 'pointer',
                x: -8,
                y: -8,
                width: 16,
                height: 16,
                xlinkHref: 'data:image/svg+xml;utf8,' + encodeURIComponent(ICON_ROTATE)
            }
        },
        {
            tagName: 'rect',
            selector: 'extras',
            attributes: {
                pointerEvents: 'none',
                fill: 'none',
                stroke: COLOR_ROTATE,
                rx: 5,
                ry: 5
            }
        }
    ],
    getPosition: function (view) {
        const { model } = view;
        const { width, height } = model.size();
        return new g.Point(width / 2, height + 10);
    },
    setPosition: function (view, coordinates) {
        const { model } = view;
        const { width, height } = model.size();
        const center = new g.Point(width / 2, height / 2);
        const angle = center.angleBetween(coordinates, this.getPosition(view));
        model.rotate(Math.round(angle));
    }
});

export class CompositeCable extends dia.Element {
    
    preinitialize() {
        this.markup = util.svg /* xml */ `
            <rect @selector="body"/>
        `;
    }
    
    defaults() {
        return util.defaultsDeep({
            type: 'CompositeCable',
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: 'none',
                    stroke: 'none',
                }
            }
        }, dia.Element.prototype.defaults);
    }
    
    getCableLink() {
        return this.getEmbeddedCells().find(cell => cell.isLink());
    }
    
    getSourceEnd() {
        const cable = this.getCableLink();
        return cable && cable.getSourceElement();
    }
    
    getTargetEnd() {
        const cable = this.getCableLink();
        return cable && cable.getTargetElement();
    }
    
    getSourceWires() {
        const sourceEnd = this.getSourceEnd();
        return sourceEnd && sourceEnd.getEmbeddedCells();
    }
    
    getTargetWires() {
        const targetEnd = this.getTargetEnd();
        return targetEnd && targetEnd.getEmbeddedCells();
    }
    
    addTools(paper) {
        
        // Tools
        
        [this.getCableLink()].forEach(link => {
            link.findView(paper).addTools(new dia.ToolsView({
                tools: [
                    new linkTools.Vertices(),
                ]
            }));
        });
        
        [this.getSourceEnd(), this.getTargetEnd()].forEach(cell => {
            cell.findView(paper).addTools(new dia.ToolsView({
                tools: [
                    new RotateTool({
                        padding: 2,
                        selector: 'body'
                    })
                ]
            }));
        });
        
        this.getSourceWires().forEach(link => {
            link.findView(paper).addTools(new dia.ToolsView({
                tools: [
                    new linkTools.Vertices(),
                    new linkTools.TargetArrowhead({
                        tagName: 'rect',
                        attributes: {
                            width: 10,
                            height: 10,
                            x: -2,
                            y: -5,
                            fill: '#222',
                            opacity: 0.1,
                            cursor: 'pointer'
                        }
                    }),
                ]
            }));
        });
        
        this.getTargetWires().forEach(link => {
            link.findView(paper).addTools(new dia.ToolsView({
                tools: [
                    new linkTools.Vertices(),
                    new linkTools.SourceArrowhead({
                        tagName: 'rect',
                        attributes: {
                            width: 10,
                            height: 10,
                            x: -7,
                            y: -5,
                            fill: '#222',
                            opacity: 0.1,
                            cursor: 'pointer'
                        }
                    }),
                ]
            }));
        });
        
    }
    
    static create(graph, colors, x1, y1, x2, y2) {
        
        const copperMarker = {
            type: 'rect',
            x: -6,
            y: -2,
            width: 8,
            height: 4,
            stroke: 'none',
            fill: '#B87333',
        };
        
        const cableSource = new shapes.standard.Rectangle({
            position: { x: 0, y: 0 },
            size: { width: 18, height: 18 },
            z: -1,
            attrs: {
                body: {
                    class: 'cable-end',
                    fill: '#222',
                    stroke: 'none',
                },
            },
        });
        
        const cableTarget = new shapes.standard.Rectangle({
            position: { x: 100, y: 0 },
            size: { width: 18, height: 18 },
            z: -1,
            attrs: {
                body: {
                    class: 'cable-end',
                    fill: '#222',
                    stroke: 'none',
                },
            },
        });
        
        const cable = new shapes.standard.Link({
            z: -2,
            source: {
                id: cableSource.id,
                anchor: { name: 'right', args: { rotate: true } },
                connectionPoint: { name: 'anchor' },
            },
            target: {
                id: cableTarget.id,
                anchor: { name: 'left', args: { rotate: true } },
                connectionPoint: { name: 'anchor' },
            },
            connector: { name: 'curve', args: { rotate: true } },
            attrs: {
                line: {
                    stroke: '#222',
                    strokeWidth: 18,
                    targetMarker: null,
                    strokeLinecap: 'square',
                },
            },
        });
        
        const compositeCable = new CompositeCable({ z: -1 });
        
        graph.addCells([
            compositeCable,
            cableSource, cableTarget,
            cable,
        ]);
        
        compositeCable.embed([cable, cableSource, cableTarget]);
        
        colors.forEach((color, index, { length: wireCount }) => {
            
            // create a formula that position the wires in a zig-zag pattern
            // for odd number of wires, the first wire is in the middle
            // for even number of wires, the first wire is on the top or bottom
            // the distances between the wires are 5 units in both cases
            const wireGap = 5;
            const dy = (wireCount % 2 === 0)
                ? (index - Math.floor(wireCount / 2) + 0.5) * wireGap
                : (index - Math.floor(wireCount / 2)) * wireGap;
            
            const wireSource = new shapes.standard.Link({
                source: {
                    id: cableSource.id,
                    anchor: { name: 'left', args: { dy, rotate: true } },
                    connectionPoint: { name: 'anchor' },
                },
                target: { x: -50, y: -10 + index * 30 },
                connector: { name: 'curve', args: { rotate: true } },
                attrs: {
                    line: {
                        stroke: color,
                        strokeWidth: 4,
                        targetMarker: copperMarker,
                    },
                },
            });
            
            const wireTarget = new shapes.standard.Link({
                source: { x: 150, y: 20 + index * 30 },
                target: {
                    id: cableTarget.id,
                    anchor: { name: 'right', args: { dy, rotate: true } },
                    connectionPoint: { name: 'anchor' },
                },
                connector: { name: 'curve', args: { rotate: true } },
                attrs: {
                    line: {
                        stroke: color,
                        strokeWidth: 4,
                        targetMarker: null,
                        sourceMarker: copperMarker,
                    },
                },
            });
            
            graph.addCells([wireSource, wireTarget]);
            cableSource.embed(wireSource);
            cableTarget.embed(wireTarget);
        });
        
        const { width: w1, height: h1 } = cableSource.size();
        const { width: w2, height: h2 } = cableTarget.size();
        
        cableSource.rotate(30);
        cableTarget.rotate(30);
        cableSource.position(x1 - w1 / 2, y1 - h1 / 2, { deep: true });
        cableTarget.position(x2 - w2 / 2, y2 - h2 / 2, { deep: true });
        
        compositeCable.fitEmbeds({ padding: 2 });
        
        // Update the size of the composite cable when the source or target end changes position.
        [cableSource, cableTarget].forEach((end) => {
            compositeCable.listenTo(end, 'change:position', () => compositeCable.fitEmbeds({ padding: 2 }));
        });
        
        return compositeCable;
    }
    
    static isCompositeCable(cell) {
        return cell instanceof CompositeCable;
    }
}

export class ScrewTerminal extends dia.Element {
    
    preinitialize() {
        this.markup = util.svg /* xml */ `
            <rect @selector="body"/>
        `;
    }
    
    defaults() {
        return util.defaultsDeep({
            type: 'ScrewTerminal',
            z: -4,
            size: { width: 50, height: 100 },
            connect: true,
            attrs: {
                root: {
                    magnet: false,
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: COLOR_TERMINAL,
                },
            },
            ports: {
                groups: {
                    left: {
                        size: { width: 20, height: 10 },
                        position: { name: 'left', args: { dy: -10 } },
                        attrs: {
                            portBody: {
                                width: 'calc(w)',
                                height: 'calc(h)',
                                magnet: 'passive',
                                fill: '#3D3B3C'
                            },
                            screw: {
                                pointerEvents: 'none',
                                transform: 'translate(calc(w/2), calc(h/2))',
                            },
                            screwHead: {
                                r: 'calc(h/2)',
                                fill: '#F5F3F6',
                                stroke: '#F5F3F6',
                                strokeWidth: 2
                            },
                            screwLine: {
                                d: 'M -calc(h/2+1) 0 L calc(h/2+1) 0',
                                stroke: '#4A3D51',
                                strokeWidth: 1,
                                transform: 'rotate(0)'
                            },
                            portLabel: {
                                fontSize: 8,
                                fontFamily: 'Arial',
                                fill: COLOR_TERMINAL_TEXT,
                            }
                        },
                        markup: util.svg /* xml */ `
                            <rect @selector="portBody"/>
                            <g @selector="screw">
                                <circle @selector="screwHead"/>
                                <path @selector="screwLine" class="screw-line"/>
                            </g>
                        `,
                        label: {
                            position: {
                                name: 'right',
                                args: { x: 2, y: 17 }
                            },
                            markup: util.svg /* xml */ `
                                <text @selector="portLabel"/>
                            `
                        }
                    },
                    right: {
                        size: { width: 20, height: 10 },
                        position: { name: 'right', args: { dx: -20, dy: -10 } },
                        attrs: {
                            portBody: {
                                width: 'calc(w)',
                                height: 'calc(h)',
                                magnet: 'passive',
                                fill: '#3D3B3C'
                            },
                            screw: {
                                pointerEvents: 'none',
                                transform: 'translate(calc(w/2), calc(h/2))',
                            },
                            screwHead: {
                                r: 'calc(h/2)',
                                fill: 'white',
                                stroke: 'white',
                                strokeWidth: 2
                            },
                            screwLine: {
                                class: 'screw-line',
                                d: 'M -calc(h/2+1) 0 L calc(h/2+1) 0',
                                stroke: 'black',
                                strokeWidth: 1,
                                transform: 'rotate(0)'
                            },
                            portLabel: {
                                fontSize: 8,
                                fontFamily: 'Arial',
                                fill: COLOR_TERMINAL_TEXT,
                            }
                        },
                        markup: util.svg /* xml */ `
                            <rect @selector="portBody"/>
                            <g @selector="screw">
                                <circle @selector="screwHead"/>
                                <path @selector="screwLine" class="screw-line"/>
                            </g>
                        `,
                        label: {
                            position: { name: 'left', args: { x: 18, y: 17 } },
                            markup: util.svg /* xml */ `
                                <text @selector="portLabel"/>
                            `
                        },
                    },
                    
                    
                }
            }
        }, dia.Element.prototype.defaults);
    }
    
    connectionStrategy(end, coords) {
        const center = this.getBBox().center();
        const dx = (coords.x > center.x) ? 20 : 0;
        end.anchor = { name: 'modelCenter', args: { dx, dy: 5 } };
        end.connectionPoint = { name: 'anchor' };
        return end;
    }
    
    static create(graph, length, x, y) {
        
        const leftPorts = Array.from({ length }, (_, i) => {
            return {
                group: 'left',
                id: `left-${i + 1}`,
                attrs: {
                    portLabel: {
                        text: `A${i}`,
                    }
                }
            };
        });
        
        const rightPorts = Array.from({ length }, (_, i) => {
            return {
                group: 'right',
                id: `right-${i + 1}`,
                attrs: {
                    portLabel: {
                        text: `B${i}`,
                    }
                }
            };
        });
        
        const width = 50;
        const height = 25 * length + 10;
        
        const st = new ScrewTerminal({
            size: { width, height },
            position: { x: x - width / 2, y: y - height / 2 },
            ports: {
                items: [
                    ...leftPorts,
                    ...rightPorts
                ]
            }
        });
        graph.addCell(st);
        return st;
    }
    
    static isScrewTerminal(cell) {
        return cell instanceof ScrewTerminal;
    }
}

export class Plug extends dia.Element {
    
    preinitialize() {
        this.markup = util.svg /* xml */ `
            <path @selector="body"/>
            <g @selector="fuse">
                <rect @selector="fuseBody"/>
                <rect @selector="fuseTopCover"/>
                <rect @selector="fuseBottomCover"/>
                <text @selector="fuseLabel"/>
            </g>
        `;
    }
    
    defaults() {
        return util.defaultsDeep({
            type: 'Plug',
            size: { width: 100, height: 80 },
            connect: true,
            z: -4,
            dropShape: {
                type: 'Plug'
            },
            attrs: {
                root: {
                    magnet: false,
                },
                body: {
                    fill: '#C0D6DF',
                    stroke: '#3E697A',
                    strokeWidth: 2,
                    strokeLinejoin: 'round',
                    d: 'M 0 0 H calc(w) V calc(h-20) L calc(w-20) calc(h) H 20 L 0 calc(h-20) Z'
                },
                fuse: {
                    transform: 'translate(75, 20)',
                },
                fuseBody: {
                    width: 10,
                    height: 40,
                    fill: '#0E3858',
                    stroke: '#0E3858',
                    strokeWidth: 1,
                },
                fuseTopCover: {
                    x: -1,
                    y: -3,
                    width: 12,
                    height: 3,
                    fill: '#2186D4',
                },
                fuseBottomCover: {
                    x: -1,
                    y: 40,
                    width: 12,
                    height: 3,
                    fill: '#2186D4',
                },
                fuseLabel: {
                    text: 'FUSE',
                    fill: '#F5F3F6',
                    fontSize: 10,
                    fontFamily: 'Arial',
                    writingMode: 'tb',
                    x: 5,
                    y: 6,
                }
            },
            ports: {
                groups: {
                    pins: {
                        size: { width: 10, height: 20 },
                        attrs: {
                            portBody: {
                                width: 'calc(w)',
                                height: 'calc(h)',
                                magnet: 'passive',
                                fill: '#3D3B3C'
                            },
                            screw: {
                                pointerEvents: 'none',
                                transform: 'translate(calc(w/2), calc(h/2))',
                            },
                            screwHead: {
                                r: 'calc(w/2)',
                                fill: '#F5F3F6',
                                stroke: '#F5F3F6',
                                strokeWidth: 2
                            },
                            screwLine: {
                                d: 'M 0 -calc(w/2+1) L 0 calc(w/2+1)',
                                stroke: '#4A3D51',
                                strokeWidth: 1,
                                transform: 'rotate(0)'
                            },
                            portLabel: {
                                fontSize: 8,
                                fontFamily: 'Arial',
                                fill: COLOR_PLUG_TEXT,
                            }
                        },
                        markup: util.svg /* xml */ `
                            <rect @selector="portBody"/>
                            <g @selector="screw">
                                <circle @selector="screwHead"/>
                                <path @selector="screwLine" class="screw-line"/>
                            </g>
                        `,
                        label: {
                            position: {
                                name: 'left',
                                args: { x: 8, y: -5 }
                            },
                            markup: util.svg /* xml */ `
                                <text @selector="portLabel"/>
                            `
                        }
                    }
                },
                items: [{
                        group: 'pins',
                        id: 'neutral',
                        args: {
                            x: 20,
                            y: 'calc(h-40)',
                        },
                        attrs: {
                            portLabel: {
                                text: 'N'
                            }
                        }
                    }, {
                        group: 'pins',
                        id: 'live',
                        args: {
                            x: 60,
                            y: 25,
                        },
                        attrs: {
                            portLabel: {
                                text: 'L'
                            }
                        }
                    }, {
                        group: 'pins',
                        id: 'earth',
                        args: {
                            x: 40,
                            y: 15,
                        },
                        attrs: {
                            portLabel: {
                                text: 'E'
                            }
                        }
                    }]
            }
        }, dia.Element.prototype.defaults);
    }
    
    connectionStrategy(end) {
        end.anchor = { name: 'modelCenter', args: { dx: 5, dy: 20 } };
        end.connectionPoint = { name: 'anchor' };
        return end;
    }
    
    static create(graph, x, y) {
        const plug = new Plug();
        const size = plug.size();
        plug.position(x - size.width / 2, y - size.height / 2);
        graph.addCell(plug);
        return plug;
    }
    
    static isPlug(cell) {
        return cell instanceof Plug;
    }
}
