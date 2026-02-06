import { dia, shapes, util, ui, g } from '@joint/plus';

import '@joint/plus/build/joint-plus.css';
import './styles.css';

const paperContainerEl = document.getElementById('paper-container');
const toolbarContainerEl = document.getElementById('toolbar-container');

// Custom view flags
const POWER_FLAG = 'POWER';
const FLOW_FLAG = 'FLOW';
const OPEN_FLAG = 'OPEN';

// Constants
const LIQUID_COLOR = '#0EAD69';
const MAX_LIQUID_COLOR = '#ED2637';
const MIN_LIQUID_COLOR = '#FFD23F';
const START_LIQUID = 70;
const PRESSURE_COLOR = '#1446A0';
const MAX_PRESSURE_COLOR = '#ED2637';

document.documentElement.style.setProperty('--liquid-color', LIQUID_COLOR);

// Pump metrics
const r = 30;
const d = 10;
const l = (3 * r) / 4;
const step = 20;

class Pump extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Pump',
            size: {
                width: 100,
                height: 100
            },
            power: 0,
            attrs: {
                root: {
                    magnetSelector: 'body'
                },
                body: {
                    rx: 'calc(w / 2)',
                    ry: 'calc(h / 2)',
                    cx: 'calc(w / 2)',
                    cy: 'calc(h / 2)',
                    stroke: 'gray',
                    strokeWidth: 2,
                    fill: 'lightgray'
                },
                label: {
                    text: 'Pump',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top',
                    x: 'calc(0.5*w)',
                    y: 'calc(h+10)',
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fill: '#350100'
                },
                rotorGroup: {
                    transform: 'translate(calc(w/2),calc(h/2))',
                    event: 'element:power:click',
                    cursor: 'pointer'
                },
                rotorFrame: {
                    r: 40,
                    fill: '#eee',
                    stroke: '#666',
                    strokeWidth: 2
                },
                rotorBackground: {
                    r: 34,
                    fill: '#777',
                    stroke: '#222',
                    strokeWidth: 1,
                    style: {
                        transition: 'fill 0.5s ease-in-out'
                    }
                },
                rotor: {
                    // d: `M ${a} ${a} ${b} ${r} -${b} ${r} -${a} ${a} -${r} ${b} -${r} -${b} -${a} -${a} -${b} -${r} ${b} -${r} ${a} -${a} ${r} -${b} ${r} ${b} Z`,
                    d: `M 0 0 V ${r} l ${-d} ${-l} Z M 0 0 V ${-r} l ${d} ${l} Z M 0 0 H ${r} l ${-l} ${d} Z M 0 0 H ${-r} l ${l} ${-d} Z`,
                    stroke: '#222',
                    strokeWidth: 3,
                    fill: '#bbb'
                }
            },
            ports: {
                groups: {
                    pipes: {
                        position: {
                            name: 'line',
                            args: {
                                start: { x: 'calc(w / 2)', y: 'calc(h)' },
                                end: { x: 'calc(w / 2)', y: 0 }
                            }
                        },
                        markup: util.svg`
                             <rect @selector='pipeBody' />
                             <rect @selector='pipeEnd' />
                         `,
                        size: { width: 80, height: 30 },
                        attrs: {
                            portRoot: {
                                magnetSelector: 'pipeEnd'
                            },
                            pipeBody: {
                                width: 'calc(w)',
                                height: 'calc(h)',
                                y: 'calc(h / -2)',
                                fill: {
                                    type: 'linearGradient',
                                    stops: [
                                        { offset: '0%', color: 'gray' },
                                        { offset: '30%', color: 'white' },
                                        { offset: '70%', color: 'white' },
                                        { offset: '100%', color: 'gray' }
                                    ],
                                    attrs: {
                                        x1: '0%',
                                        y1: '0%',
                                        x2: '0%',
                                        y2: '100%'
                                    }
                                }
                            },
                            pipeEnd: {
                                width: 10,
                                height: 'calc(h+6)',
                                y: 'calc(h / -2 - 3)',
                                stroke: 'gray',
                                strokeWidth: 3,
                                fill: 'white'
                            }
                        }
                    }
                },
                items: [
                    {
                        id: 'left',
                        group: 'pipes',
                        z: 1,
                        attrs: {
                            pipeBody: {
                                x: 'calc(-1 * w)'
                            },
                            pipeEnd: {
                                x: 'calc(-1 * w)'
                            }
                        }
                    },
                    {
                        id: 'right',
                        group: 'pipes',
                        z: 0,
                        attrs: {
                            pipeEnd: {
                                x: 'calc(w - 10)'
                            }
                        }
                    }
                ]
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
             <ellipse @selector='body' />
             <g @selector='rotorGroup'>
                 <circle @selector='rotorFrame' />
                 <circle @selector='rotorBackground' />
                 <path @selector='rotor' />
             </g>
             <text @selector='label' />
         `;
    }

    get power() {
        return this.get('power') || 0;
    }

    set power(value) {
        this.set('power', value);
    }
}

const PumpView = dia.ElementView.extend({
    presentationAttributes: dia.ElementView.addPresentationAttributes({
        power: [POWER_FLAG]
    }),

    initFlag: [dia.ElementView.Flags.RENDER, POWER_FLAG],

    powerAnimation: null,

    confirmUpdate(...args) {
        let flags = dia.ElementView.prototype.confirmUpdate.call(this, ...args);
        if (this.hasFlag(flags, POWER_FLAG)) {
            this.togglePower();
            flags = this.removeFlag(flags, POWER_FLAG);
        }
        return flags;
    },

    getSpinAnimation() {
        let { spinAnimation } = this;
        if (spinAnimation) return spinAnimation;
        const rotorEl = this.findNode('rotor');
        // It's important to use start and end frames to make it work in Safari.
        const keyframes = { transform: ['rotate(0deg)', 'rotate(360deg)'] };
        spinAnimation = rotorEl.animate(keyframes, {
            fill: 'forwards',
            duration: 1000,
            iterations: Infinity
        });
        this.spinAnimation = spinAnimation;
        return spinAnimation;
    },

    togglePower() {
        const { model } = this;
        this.getSpinAnimation().playbackRate = model.power;
    }
});

class ControlValve extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'ControlValve',
            size: {
                width: 60,
                height: 60
            },
            open: 1,
            attrs: {
                root: {
                    magnetSelector: 'body'
                },
                body: {
                    rx: 'calc(w / 2)',
                    ry: 'calc(h / 2)',
                    cx: 'calc(w / 2)',
                    cy: 'calc(h / 2)',
                    stroke: 'gray',
                    strokeWidth: 2,
                    fill: {
                        type: 'radialGradient',
                        stops: [
                            { offset: '80%', color: 'white' },
                            { offset: '100%', color: 'gray' }
                        ]
                    }
                },
                liquid: {
                    // We use path instead of rect to make it possible to animate
                    // the stroke-dasharray to show the liquid flow.
                    d: 'M calc(w / 2 + 12) calc(h / 2) h -24',
                    stroke: LIQUID_COLOR,
                    strokeWidth: 24,
                    strokeDasharray: '3,1'
                },
                cover: {
                    x: 'calc(w / 2 - 12)',
                    y: 'calc(h / 2 - 12)',
                    width: 24,
                    height: 24,
                    stroke: '#333',
                    strokeWidth: 2,
                    fill: '#fff'
                },
                coverFrame: {
                    x: 'calc(w / 2 - 15)',
                    y: 'calc(h / 2 - 15)',
                    width: 30,
                    height: 30,
                    stroke: '#777',
                    strokeWidth: 2,
                    fill: 'none',
                    rx: 1,
                    ry: 1
                },
                stem: {
                    width: 10,
                    height: 30,
                    x: 'calc(w / 2 - 5)',
                    y: -30,
                    stroke: '#333',
                    strokeWidth: 2,
                    fill: '#555'
                },
                control: {
                    d: 'M 0 0 C 0 -30 60 -30 60 0 Z',
                    transform: 'translate(calc(w / 2 - 30), -20)',
                    stroke: '#333',
                    strokeWidth: 2,
                    rx: 5,
                    ry: 5,
                    fill: '#666'
                },
                label: {
                    text: 'Valve',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top',
                    x: 'calc(0.5*w)',
                    y: 'calc(h+10)',
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fill: '#350100'
                }
            },
            ports: {
                groups: {
                    pipes: {
                        position: {
                            name: 'absolute',
                            args: {
                                x: 'calc(w / 2)',
                                y: 'calc(h / 2)'
                            }
                        },
                        markup: util.svg`
                           <rect @selector='pipeBody' />
                           <rect @selector='pipeEnd' />
                       `,
                        size: { width: 50, height: 30 },
                        attrs: {
                            portRoot: {
                                magnetSelector: 'pipeEnd'
                            },
                            pipeBody: {
                                width: 'calc(w)',
                                height: 'calc(h)',
                                y: 'calc(h / -2)',
                                fill: {
                                    type: 'linearGradient',
                                    stops: [
                                        { offset: '0%', color: 'gray' },
                                        { offset: '30%', color: 'white' },
                                        { offset: '70%', color: 'white' },
                                        { offset: '100%', color: 'gray' }
                                    ],
                                    attrs: {
                                        x1: '0%',
                                        y1: '0%',
                                        x2: '0%',
                                        y2: '100%'
                                    }
                                }
                            },
                            pipeEnd: {
                                width: 10,
                                height: 'calc(h+6)',
                                y: 'calc(h / -2 - 3)',
                                stroke: 'gray',
                                strokeWidth: 3,
                                fill: 'white'
                            }
                        }
                    }
                },
                items: [
                    {
                        id: 'left',
                        group: 'pipes',
                        z: 0,
                        attrs: {
                            pipeBody: {
                                x: 'calc(-1 * w)'
                            },
                            pipeEnd: {
                                x: 'calc(-1 * w)'
                            }
                        }
                    },
                    {
                        id: 'right',
                        group: 'pipes',
                        z: 0,
                        attrs: {
                            pipeEnd: {
                                x: 'calc(w - 10)'
                            }
                        }
                    }
                ]
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
           <rect @selector='stem' />
           <path @selector='control' />
           <ellipse @selector='body' />
           <rect @selector='coverFrame' />
           <path @selector='liquid' />
           <rect @selector='cover' />
           <text @selector='label' />
       `;
    }
}

const ControlValveView = dia.ElementView.extend({
    presentationAttributes: dia.ElementView.addPresentationAttributes({
        open: [OPEN_FLAG]
    }),

    initFlag: [dia.ElementView.Flags.RENDER, OPEN_FLAG],

    framePadding: 6,

    liquidAnimation: null,

    confirmUpdate(...args) {
        let flags = dia.ElementView.prototype.confirmUpdate.call(this, ...args);
        this.animateLiquid();
        if (this.hasFlag(flags, OPEN_FLAG)) {
            this.updateCover();
            flags = this.removeFlag(flags, OPEN_FLAG);
        }
        return flags;
    },

    updateCover() {
        const { model } = this;
        const opening = Math.max(0, Math.min(1, model.get('open') || 0));
        const coverEl = this.findNode('cover');
        const coverFrameEl = this.findNode('coverFrame');
        const frameWidth =
            Number(coverFrameEl.getAttribute('width')) - this.framePadding;
        const width = Math.round(frameWidth * (1 - opening));
        coverEl.animate(
            {
                width: [`${width}px`]
            },
            {
                fill: 'forwards',
                duration: 200
            }
        );
    },

    animateLiquid() {
        if (this.liquidAnimation) return;
        const liquidEl = this.findNode('liquid');
        this.liquidAnimation = liquidEl.animate(
            {
                // 24 matches the length of the liquid path
                strokeDashoffset: [0, 24]
            },
            {
                fill: 'forwards',
                iterations: Infinity,
                duration: 3000
            }
        );
    }
});

class HandValve extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'HandValve',
            size: {
                width: 50,
                height: 50
            },
            power: 0,
            attrs: {
                root: {
                    magnetSelector: 'body'
                },
                body: {
                    rx: 'calc(w / 2)',
                    ry: 'calc(h / 2)',
                    cx: 'calc(w / 2)',
                    cy: 'calc(h / 2)',
                    stroke: 'gray',
                    strokeWidth: 2,
                    fill: {
                        type: 'radialGradient',
                        stops: [
                            { offset: '70%', color: 'white' },
                            { offset: '100%', color: 'gray' }
                        ]
                    }
                },
                stem: {
                    width: 10,
                    height: 30,
                    x: 'calc(w / 2 - 5)',
                    y: -30,
                    stroke: '#333',
                    strokeWidth: 2,
                    fill: '#555'
                },
                handwheel: {
                    width: 60,
                    height: 10,
                    x: 'calc(w / 2 - 30)',
                    y: -30,
                    stroke: '#333',
                    strokeWidth: 2,
                    rx: 5,
                    ry: 5,
                    fill: '#666'
                },
                label: {
                    text: 'Valve',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top',
                    x: 'calc(0.5*w)',
                    y: 'calc(h+10)',
                    fontSize: '14',
                    fontFamily: 'sans-serif',
                    fill: '#350100'
                }
            },
            ports: {
                groups: {
                    pipes: {
                        position: {
                            name: 'absolute',
                            args: {
                                x: 'calc(w / 2)',
                                y: 'calc(h / 2)'
                            }
                        },
                        markup: util.svg`
                           <rect @selector='pipeBody' />
                           <rect @selector='pipeEnd' />
                       `,
                        size: { width: 50, height: 30 },
                        attrs: {
                            portRoot: {
                                magnetSelector: 'pipeEnd'
                            },
                            pipeBody: {
                                width: 'calc(w)',
                                height: 'calc(h)',
                                y: 'calc(h / -2)',
                                fill: {
                                    type: 'linearGradient',
                                    stops: [
                                        { offset: '0%', color: 'gray' },
                                        { offset: '30%', color: 'white' },
                                        { offset: '70%', color: 'white' },
                                        { offset: '100%', color: 'gray' }
                                    ],
                                    attrs: {
                                        x1: '0%',
                                        y1: '0%',
                                        x2: '0%',
                                        y2: '100%'
                                    }
                                }
                            },
                            pipeEnd: {
                                width: 10,
                                height: 'calc(h+6)',
                                y: 'calc(h / -2 - 3)',
                                stroke: 'gray',
                                strokeWidth: 3,
                                fill: 'white'
                            }
                        }
                    }
                },
                items: [
                    {
                        id: 'left',
                        group: 'pipes',
                        z: 0,
                        attrs: {
                            pipeBody: {
                                x: 'calc(-1 * w)'
                            },
                            pipeEnd: {
                                x: 'calc(-1 * w)'
                            }
                        }
                    },
                    {
                        id: 'right',
                        group: 'pipes',
                        z: 0,
                        attrs: {
                            pipeEnd: {
                                x: 'calc(w - 10)'
                            }
                        }
                    }
                ]
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
           <rect @selector='stem' />
           <rect @selector='handwheel' />
           <ellipse @selector='body' />
           <text @selector='label' />
       `;
    }
}
class LiquidTank extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'LiquidTank',
            size: {
                width: 160,
                height: 300
            },
            attrs: {
                root: {
                    magnetSelector: 'body'
                },
                legs: {
                    fill: 'none',
                    stroke: '#350100',
                    strokeWidth: 8,
                    strokeLinecap: 'round',
                    d: 'M 20 calc(h) l -5 10 M calc(w - 20) calc(h) l 5 10'
                },
                body: {
                    stroke: 'gray',
                    strokeWidth: 4,
                    x: 0,
                    y: 0,
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 120,
                    ry: 10,
                    fill: {
                        type: 'linearGradient',
                        stops: [
                            { offset: '0%', color: 'gray' },
                            { offset: '30%', color: 'white' },
                            { offset: '70%', color: 'white' },
                            { offset: '100%', color: 'gray' }
                        ]
                    }
                },
                top: {
                    x: 0,
                    y: 20,
                    width: 'calc(w)',
                    height: 20,
                    fill: 'none',
                    stroke: 'gray',
                    strokeWidth: 2
                },
                label: {
                    text: 'Tank 1',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top',
                    x: 'calc(w / 2)',
                    y: 'calc(h + 10)',
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fill: '#350100'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
             <path @selector='legs'/>
             <rect @selector='body'/>
             <rect @selector='top'/>
             <text @selector='label' />
         `;
    }

    get level() {
        return this.get('level') || 0;
    }

    set level(level) {
        const newLevel = Math.max(0, Math.min(100, level));
        this.set('level', newLevel);
    }
}

const LEVEL_FLAG = 'LEVEl';

const PanelView = dia.ElementView.extend({
    presentationAttributes: dia.ElementView.addPresentationAttributes({
        level: [LEVEL_FLAG],
        color: [LEVEL_FLAG]
    }),

    initFlag: [dia.ElementView.Flags.RENDER, LEVEL_FLAG],

    confirmUpdate(...args) {
        let flags = dia.ElementView.prototype.confirmUpdate.call(this, ...args);
        if (this.hasFlag(flags, LEVEL_FLAG)) {
            this.updateLevel();
            flags = this.removeFlag(flags, LEVEL_FLAG);
        }
        return flags;
    },

    updateLevel() {
        const { model } = this;
        const level = Math.max(0, Math.min(100, model.get('level') || 0));
        const color = model.get('color') || 'red';
        const liquidEl = this.findNode('liquid');
        const windowEl = this.findNode('frame');
        const windowHeight = Number(windowEl.getAttribute('height'));
        const height = Math.round((windowHeight * level) / 100);
        liquidEl.animate(
            {
                height: [`${height}px`],
                fill: [color]
            },
            {
                fill: 'forwards',
                duration: 1000
            }
        );
    }
});

class ConicTank extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'ConicTank',
            size: {
                width: 160,
                height: 100
            },
            attrs: {
                root: {
                    magnetSelector: 'body'
                },
                body: {
                    stroke: 'gray',
                    strokeWidth: 4,
                    x: 0,
                    y: 0,
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 120,
                    ry: 10,
                    fill: {
                        type: 'linearGradient',
                        stops: [
                            { offset: '0%', color: 'gray' },
                            { offset: '30%', color: 'white' },
                            { offset: '70%', color: 'white' },
                            { offset: '100%', color: 'gray' }
                        ]
                    }
                },
                top: {
                    x: 0,
                    y: 20,
                    width: 'calc(w)',
                    height: 20,
                    fill: 'none',
                    stroke: 'gray',
                    strokeWidth: 2
                },
                bottom: {
                    d: 'M 0 0 L calc(w) 0 L calc(w / 2 + 10) 70 h -20 Z',
                    transform: 'translate(0, calc(h - 10))',
                    stroke: 'gray',
                    strokeLinejoin: 'round',
                    strokeWidth: 2,
                    fill: {
                        type: 'linearGradient',
                        stops: [
                            { offset: '10%', color: '#aaa' },
                            { offset: '30%', color: '#fff' },
                            { offset: '90%', color: '#aaa' }
                        ],
                        attrs: {
                            gradientTransform: 'rotate(-10)'
                        }
                    }
                },
                label: {
                    text: 'Tank 2',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'bottom',
                    x: 'calc(w / 2)',
                    y: -10,
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fill: '#350100'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
           <path @selector='bottom'/>
           <rect @selector='body'/>
           <rect @selector='top'/>
           <text @selector='label' />
       `;
    }
}

class Panel extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Panel',
            size: {
                width: 100,
                height: 230
            },
            level: 0,
            attrs: {
                root: {
                    magnetSelector: 'panelBody'
                },
                panelBody: {
                    x: 0,
                    y: 0,
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 1,
                    ry: 1,
                    fill: 'lightgray',
                    stroke: 'gray',
                    strokeWidth: 1
                },
                panelWindow: {
                    // turn the panel over so that we can grow the liquid from the bottom
                    // by increasing the height of the bar.
                    transform: 'translate(10, 10) rotate(180) translate(-40,-205)'
                },
                panelTicks: {
                    transform: 'translate(55, 15)',
                    d: `M 0 0 h 8 M 0 ${step} h 8 M 0 ${step * 2} h 8 M 0 ${step * 3
                    } h 8 M 0 ${step * 4} h 8 M 0 ${step * 5} h 8 M 0 ${step * 6
                    } h 8 M 0 ${step * 7} h 8 M 0 ${step * 8} h 8 M 0 ${step * 9
                    } h 8 M 0 ${step * 10} h 8`,
                    fill: 'none',
                    stroke: 'black',
                    strokeWidth: 2,
                    strokeLinecap: 'round'
                },
                panelValues: {
                    text: '100\n90\n80\n70\n60\n50\n40\n30\n20\n10\n0',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top',
                    x: 80,
                    y: 10,
                    lineHeight: step,
                    fontSize: 14,
                    fontFamily: 'sans-serif'
                },
                frame: {
                    width: 40,
                    height: 200,
                    rx: 1,
                    ry: 1,
                    fill: 'none',
                    stroke: 'black',
                    strokeWidth: 3
                },
                liquid: {
                    x: 0,
                    y: 0,
                    width: 40,
                    height: 0,
                    stroke: 'black',
                    strokeWidth: 2,
                    strokeOpacity: 0.2,
                    fill: MIN_LIQUID_COLOR
                },
                glass: {
                    x: 0,
                    y: 0,
                    width: 40,
                    height: 200,
                    fill: 'blue',
                    stroke: 'none',
                    fillOpacity: 0.1
                },
                label: {
                    text: 'Tank 1',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top',
                    x: 'calc(w / 2)',
                    y: 'calc(h + 10)',
                    fontSize: 20,
                    fontFamily: 'sans-serif',
                    fill: '#350100'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
             <rect @selector='panelBody'/>
             <path @selector='panelTicks'/>
             <text @selector='panelValues' />
             <g @selector='panelWindow'>
                 <rect @selector='glass'/>
                 <rect @selector='liquid'/>
                 <rect @selector='frame'/>
             </g>
       `;
    }
}

class Pipe extends dia.Link {
    defaults() {
        return {
            ...super.defaults,
            type: 'Pipe',
            z: -1,
            router: { name: 'rightAngle' },
            flow: 1,
            attrs: {
                liquid: {
                    connection: true,
                    stroke: LIQUID_COLOR,
                    strokeWidth: 10,
                    strokeLinejoin: 'round',
                    strokeLinecap: 'square',
                    strokeDasharray: '10,20'
                },
                line: {
                    connection: true,
                    stroke: '#eee',
                    strokeWidth: 10,
                    strokeLinejoin: 'round',
                    strokeLinecap: 'round'
                },
                outline: {
                    connection: true,
                    stroke: '#444',
                    strokeWidth: 16,
                    strokeLinejoin: 'round',
                    strokeLinecap: 'round'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
             <path @selector='outline' fill='none'/>
             <path @selector='line' fill='none'/>
             <path @selector='liquid' fill='none'/>
         `;
    }
}

const PipeView = dia.LinkView.extend({
    presentationAttributes: dia.LinkView.addPresentationAttributes({
        flow: [FLOW_FLAG]
    }),

    initFlag: [...dia.LinkView.prototype.initFlag, FLOW_FLAG],

    flowAnimation: null,

    confirmUpdate(...args) {
        let flags = dia.LinkView.prototype.confirmUpdate.call(this, ...args);
        if (this.hasFlag(flags, FLOW_FLAG)) {
            this.updateFlow();
            flags = this.removeFlag(flags, FLOW_FLAG);
        }
        return flags;
    },

    getFlowAnimation() {
        let { flowAnimation } = this;
        if (flowAnimation) return flowAnimation;
        const liquidEl = this.findNode('liquid');
        // stroke-dashoffset = sum(stroke-dasharray) * n;
        // 90 = 10 + 20 + 10 + 20 + 10 + 20
        const keyframes = { strokeDashoffset: [90, 0] };
        flowAnimation = liquidEl.animate(keyframes, {
            fill: 'forwards',
            duration: 1000,
            iterations: Infinity
        });
        this.flowAnimation = flowAnimation;
        return flowAnimation;
    },

    updateFlow() {
        const { model } = this;
        const flowRate = model.get('flow') || 0;
        this.getFlowAnimation().playbackRate = flowRate;
        const liquidEl = this.findNode('liquid');
        liquidEl.style.stroke = flowRate === 0 ? '#ccc' : '';
    }
});

class Zone extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Zone',
            size: {
                width: 120,
                height: 40
            },
            attrs: {
                body: {
                    fill: '#ffffff',
                    stroke: '#cad8e3',
                    strokeWidth: 1,
                    d: 'M 0 calc(0.5*h) calc(0.5*h) 0 H calc(w) V calc(h) H calc(0.5*h) Z'
                },
                label: {
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fontWeight: 'bold',
                    fill: LIQUID_COLOR,
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    x: 'calc(w / 2 + 10)',
                    y: 'calc(h / 2)'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
             <path @selector='body'/>
             <text @selector='label'/>
         `;
    }
}

class Join extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Join',
            size: {
                width: 30,
                height: 30
            },
            attrs: {
                body: {
                    fill: '#eee',
                    stroke: '#666',
                    strokeWidth: 2,
                    d:
                        'M 10 0 H calc(w - 10) l 10 10 V calc(h - 10) l -10 10 H 10 l -10 -10 V 10 Z'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg/* xml */ `
             <path @selector='body'/>
         `;
    }
}

const namespace = {
    ...shapes,
    Zone,
    Pipe,
    PipeView,
    LiquidTank,
    ConicTank,
    Panel,
    PanelView,
    Pump,
    PumpView,
    ControlValve,
    ControlValveView,
    HandValve,
    Join
};

const graph = new dia.Graph(
    {},
    {
        cellNamespace: namespace
    }
);

const paper = new dia.Paper({
    model: graph,
    width: '100%',
    height: '100%',
    async: true,
    frozen: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#F3F7F6' },
    interactive: {
        linkMove: false,
        stopDelegation: false
    },
    cellViewNamespace: namespace,
    defaultAnchor: {
        name: 'perpendicular'
    }
});

paperContainerEl.appendChild(paper.el);

// Tanks

const tank1 = new LiquidTank({
    position: { x: 50, y: 250 }
});
const panel1 = new Panel({
    position: { x: 70, y: 300 }
});

// When the tank level changes, update the panel level and color.
panel1.listenTo(tank1, 'change:level', (_, level) => {
    const color =
        level > 80
            ? MAX_LIQUID_COLOR
            : level < 20
                ? MIN_LIQUID_COLOR
                : LIQUID_COLOR;
    panel1.set({ level, color });
});

tank1.addTo(graph);
panel1.addTo(graph);
tank1.embed(panel1);

// Tank 2

const tank2 = new ConicTank({
    position: { x: 820, y: 200 }
});

tank2.addTo(graph);

// Pumps

const pump1 = new Pump({
    position: { x: 460, y: 250 },
    attrs: {
        label: {
            text: 'Pump 1'
        }
    }
});

pump1.addTo(graph);
pump1.power = 1;

const pump2 = new Pump({
    position: { x: 460, y: 450 },
    attrs: {
        label: {
            text: 'Pump 2'
        }
    }
});

pump2.addTo(graph);
pump2.power = 0;

// CTRL Valves

const controlValve1 = new ControlValve({
    position: { x: 300, y: 295 },
    open: 1,
    attrs: {
        label: {
            text: 'CTRL Valve 1'
        }
    }
});

controlValve1.addTo(graph);

const controlValve2 = new ControlValve({
    position: { x: 300, y: 495 },
    open: 0.25,
    attrs: {
        label: {
            text: 'CTRL Valve 2'
        }
    }
});

controlValve2.addTo(graph);

// Zones

const zone1 = new Zone({
    position: { x: 50, y: 600 },
    attrs: {
        label: {
            text: 'Zone 1'
        }
    }
});

const zone2 = new Zone({
    position: { x: 865, y: 600 },
    attrs: {
        label: {
            text: 'Zone 2'
        }
    }
});

graph.addCells([zone1, zone2]);

// Hand Valves

const handValve1 = new HandValve({
    position: { x: 875, y: 450 },
    open: 1,
    angle: 270,
    attrs: {
        label: {
            text: 'Valve 1'
        }
    }
});

handValve1.addTo(graph);

const handValve2 = new HandValve({
    position: { x: 650, y: 250 },
    open: 1,
    angle: 0,
    attrs: {
        label: {
            text: 'Valve 2'
        }
    }
});

handValve2.addTo(graph);

const handValve3 = new HandValve({
    position: { x: 650, y: 450 },
    open: 1,
    angle: 0,
    attrs: {
        label: {
            text: 'Valve 3'
        }
    }
});

handValve3.addTo(graph);

// Joins

const join1 = new Join({
    position: { x: 772, y: 460 }
});

join1.addTo(graph);

const join2 = new Join({
    position: { x: 810, y: 605 }
});

join2.addTo(graph);

// Pipes

const tank1Pipe1 = new Pipe({
    source: {
        id: tank1.id,
        anchor: { name: 'right', args: { dy: -25 }},
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: controlValve1.id,
        port: 'left',
        anchor: { name: 'left' }
    }
});

tank1Pipe1.addTo(graph);

const tank1Pipe2 = new Pipe({
    source: {
        id: tank1.id,
        anchor: { name: 'bottomRight', args: { dy: -40 }},
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: controlValve2.id,
        port: 'left',
        anchor: { name: 'left' },
        connectionPoint: { name: 'anchor' }
    }
});

tank1Pipe2.addTo(graph);

const tank2Pipe1 = new Pipe({
    source: {
        id: tank2.id,
        selector: 'bottom',
        anchor: { name: 'bottom' },
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: handValve1.id,
        port: 'right',
        anchor: { name: 'right', args: { rotate: true }},
        connectionPoint: { name: 'anchor' }
    }
});

tank2Pipe1.addTo(graph);

const ctrlValve1Pipe1 = new Pipe({
    source: { id: controlValve1.id, port: 'right', anchor: { name: 'right' }},
    target: { id: pump1.id, port: 'left', anchor: { name: 'left' }}
});

ctrlValve1Pipe1.addTo(graph);

const valve2Pipe1 = new Pipe({
    source: {
        id: handValve2.id,
        port: 'right',
        anchor: { name: 'right', args: { rotate: true }},
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: join1.id,
        anchor: { name: 'top' },
        connectionPoint: { name: 'anchor' }
    }
});

valve2Pipe1.addTo(graph);

const valve1Pipe1 = new Pipe({
    source: {
        id: handValve1.id,
        port: 'left',
        anchor: { name: 'left', args: { rotate: true }},
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: join2.id,
        anchor: { name: 'top' },
        connectionPoint: { name: 'anchor' }
    }
});

valve1Pipe1.addTo(graph);

const pump1Pipe1 = new Pipe({
    source: {
        id: pump1.id,
        port: 'right',
        anchor: { name: 'right', args: { rotate: true }},
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: handValve2.id,
        port: 'left',
        anchor: { name: 'left', args: { rotate: true }},
        connectionPoint: { name: 'anchor' }
    }
});

pump1Pipe1.addTo(graph);

const valve3Pipe1 = new Pipe({
    source: {
        id: handValve3.id,
        port: 'right',
        anchor: { name: 'right', args: { rotate: true }},
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: join1.id,
        anchor: { name: 'left' },
        connectionPoint: { name: 'anchor' }
    }
});

valve3Pipe1.addTo(graph);

const pump2Pipe1 = new Pipe({
    source: {
        id: pump2.id,
        port: 'right',
        anchor: { name: 'right', args: { rotate: true }},
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: handValve3.id,
        port: 'left',
        anchor: { name: 'left', args: { rotate: true }},
        connectionPoint: { name: 'anchor' }
    }
});

pump2Pipe1.addTo(graph);

const ctrlValve2Pipe1 = new Pipe({
    source: { id: controlValve2.id, port: 'right', anchor: { name: 'right' }},
    target: {
        id: pump2.id,
        port: 'left',
        anchor: { name: 'left', args: { rotate: true }},
        connectionPoint: { name: 'anchor' }
    }
});

ctrlValve2Pipe1.addTo(graph);

const zone1Pipe1 = new Pipe({
    source: {
        id: zone1.id,
        port: 'left',
        anchor: { name: 'left', args: { rotate: true, dx: 10 }},
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: tank1.id,
        anchor: { name: 'bottomLeft', args: { dy: -30 }},
        connectionPoint: { name: 'anchor' }
    }
});

zone1Pipe1.addTo(graph);

const join1Pipe1 = new Pipe({
    source: {
        id: join1.id,
        anchor: { name: 'bottom' },
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: join2.id,
        anchor: { name: 'left' },
        connectionPoint: { name: 'anchor' }
    }
});

join1Pipe1.addTo(graph);

const join2Pipe1 = new Pipe({
    source: {
        id: join2.id,
        anchor: { name: 'right' },
        connectionPoint: { name: 'anchor' }
    },
    target: {
        id: zone2.id,
        anchor: { name: 'left', args: { dx: 10 }},
        connectionPoint: { name: 'anchor' }
    }
});

join2Pipe1.addTo(graph);

// Charts

const maxPoints = 10;
const tankChart = new shapes.chart.Plot({
    position: { x: 50, y: 50 },
    size: { width: 300, height: 150 },
    series: [
        {
            name: 'level',
            interpolate: 'linear',
            showLegend: false,
            fillPadding: { top: 10 },
            data: Array.from({ length: maxPoints }).map((_, i) => ({
                x: i,
                y: START_LIQUID
            }))
        }
    ],
    axis: {
        'y-axis': {
            min: 0,
            max: 100,
            ticks: 10
        },
        'x-axis': {
            tickFormat: function(t) {
                const d = new Date(t * 1000);
                return (
                    d.getMinutes().toString().padStart(2, '0') +
                    ':' +
                    d.getSeconds().toString().padStart(2, '0')
                );
            }
        }
    },
    padding: 0,
    markings: [
        {
            name: 'max',
            start: { y: 80 }
        },
        {
            name: 'min',
            end: { y: 20 }
        }
    ],
    // Historically, the chart shapes are defined without camel-cased attributes
    attrs: {
        '.': {
            'font-family': 'sans-serif'
        },
        '.level path': {
            stroke: '#0075f2',
            'stroke-width': 1,
            'stroke-opacity': '0.8',
            fill: '#0075f2',
            'fill-opacity': '0.3'
        },
        '.marking.max rect': {
            fill: MAX_LIQUID_COLOR,
            height: 3
        },
        '.marking.min rect': {
            fill: MIN_LIQUID_COLOR,
            height: 3
        },
        '.point circle': {
            fill: '#0075f2',
            stroke: 'none',
            opacity: 1
        },
        '.y-axis > path, .x-axis > path': {
            stroke: '#131e29',
            'stroke-width': 2
        },
        '.background rect': {
            fill: '#999',
            'fill-opacity': '0.1'
        }
    }
});

tankChart.addTo(graph);

const tankChartLink = new shapes.standard.Link({
    source: { id: tankChart.id },
    target: { id: tank1.id },
    attrs: {
        line: {
            strokeDasharray: '5 5',
            targetMarker: null,
            stroke: '#aaa'
        }
    }
});

tankChartLink.addTo(graph);

const gauge1 = new shapes.chart.Knob({
    position: { x: 380, y: 100 },
    size: { width: 120, height: 120 },
    min: 0,
    max: 10,
    step: 0.1,
    value: 1,
    fill: PRESSURE_COLOR,
    // Historically, the chart shapes are defined without camel-cased attributes
    attrs: {
        root: {
            'font-family': 'sans-serif'
        }
    },
    serieDefaults: {
        startAngle: 90,
        label: 'Ⓟ bar'
    },
    sliceDefaults: {
        legendLabel: '{value:.1f}',
        onClickEffect: { type: 'none' }
    }
});

gauge1.addTo(graph);

const gauge1Link = new shapes.standard.Link({
    source: { id: gauge1.id, anchor: { name: 'bottom' }},
    target: { id: ctrlValve1Pipe1.id },
    z: -1,
    attrs: {
        line: {
            strokeDasharray: '5 5',
            targetMarker: {
                type: 'circle',
                r: 12,
                fill: '#eee',
                stroke: '#666',
                'stroke-width': 2
            },
            stroke: '#aaa'
        }
    }
});

gauge1Link.addTo(graph);

const gauge2 = gauge1.clone();
const gauge2Link = gauge1Link.clone();

gauge2.position(380, 600);

gauge2Link.source({ id: gauge2.id, anchor: { name: 'bottom' }});
gauge2Link.target({ id: ctrlValve2Pipe1.id });

gauge2.addTo(graph);
gauge2Link.addTo(graph);

// Controls
// A custom highlighters using the foreignObject element to embed HTML form controls
// The styling is done in CSS

const PumpControl = dia.HighlighterView.extend({
    UPDATE_ATTRIBUTES: ['power'],
    tagName: 'g',
    children: util.svg/* xml */ `
         <foreignObject width='20' height='20'>
             <div class='jj-checkbox' xmlns='http://www.w3.org/1999/xhtml'>
                 <input @selector='input' class='jj-checkbox-input' type='checkbox' style='width: 14px; height: 14px; box-sizing: border-box; margin: 2px;'/>
             </div>
         </foreignObject>
     `,
    events: {
        'change input': 'onChange'
    },
    attributes: {
        transform: 'translate(5, 5)'
    },
    highlight: function(cellView) {
        this.renderChildren();
        this.childNodes.input.checked = Boolean(cellView.model.power);
    },
    onChange: function(evt) {
        this.cellView.model.power = evt.target.checked ? 1 : 0;
    }
});

const ToggleValveControl = dia.HighlighterView.extend({
    UPDATE_ATTRIBUTES: ['open'],
    children: util.svg/* xml */ `
         <foreignObject width='100' height='50'>
             <div class='jj-switch' xmlns='http://www.w3.org/1999/xhtml'>
                 <div @selector='label' class='jj-switch-label' style=''></div>
                 <button @selector='buttonOn' class='jj-switch-on'>open</button>
                 <button @selector='buttonOff' class='jj-switch-off'>close</button>
             </div>
         </foreignObject>
     `,
    events: {
        'click button': 'onButtonClick'
    },
    highlight: function(cellView) {
        this.renderChildren();
        const { model } = cellView;
        const { el, childNodes } = this;
        const size = model.size();
        const isOpen = model.get('open');
        el.setAttribute(
            'transform',
            `translate(${size.width / 2 - 50}, ${size.height + 10})`
        );
        childNodes.buttonOn.disabled = !isOpen;
        childNodes.buttonOff.disabled = isOpen;
        childNodes.label.textContent = model.attr('label/text');
    },
    onButtonClick: function(evt) {
        const { model } = this.cellView;
        const isOpen = model.get('open');
        model.set('open', !isOpen);
    }
});

const SliderValveControl = dia.HighlighterView.extend({
    UPDATE_ATTRIBUTES: ['open'],
    children: util.svg/* xml */ `
         <foreignObject width='100' height='60'>
             <div class='jj-slider' xmlns='http://www.w3.org/1999/xhtml'>
                 <div @selector='label' class='jj-slider-label' style=''>Valve 4</div>
                 <input @selector='slider' class='jj-slider-input' type='range' min='0' max='100' step='25' style='width:100%;'/>
                 <output @selector='value' class='jj-slider-output'></output>
             </div>
         </foreignObject>
     `,
    events: {
        'input input': 'onInput'
    },
    highlight: function(cellView) {
        const { name = '' } = this.options;
        const { model } = cellView;
        const size = model.size();
        if (!this.childNodes) {
            // Render the slider only once to allow the user to drag it.
            this.renderChildren();
            this.childNodes.slider.value = model.get('open') * 100;
        }
        this.el.setAttribute(
            'transform',
            `translate(${size.width / 2 - 50}, ${size.height + 10})`
        );
        this.childNodes.label.textContent = name;
        this.childNodes.value.textContent = this.getSliderTextValue(
            model.get('open')
        );
    },
    getSliderTextValue: function(value = 0) {
        if (value === 0) {
            return 'Closed';
        }
        if (value === 1) {
            return 'Open';
        }
        return `${value * 100}% open`;
    },
    onInput: function(evt) {
        this.cellView.model.set('open', Number(evt.target.value) / 100);
    }
});

// Create all controls and add them to the graph
addControls(paper);

// Transform the paper so that the content fits the viewport
paper.transformToFitContent({
    useModelGeometry: true,
    padding: { top: 80, bottom: 10, horizontal: 50 },
    horizontalAlign: 'middle',
    verticalAlign: 'top'
});

// Start rendering the content and highlighters
paper.unfreeze();

// Toolbar

const toolbar = new ui.Toolbar({
    tools: [
        {
            type: 'label',
            name: 'title',
            text: 'SCADA: Piping & Instrumentation Diagram'
        },
        {
            type: 'separator'
        },
        {
            type: 'checkbox',
            name: 'controls',
            label: 'Controls',
            value: true
        },
        {
            type: 'checkbox',
            name: 'instrumentation',
            label: 'Instrumentation',
            value: true
        },
        {
            type: 'separator'
        },
        {
            type: 'label',
            text: 'Color'
        },
        {
            type: 'color-picker',
            name: 'color',
            value: getComputedStyle(document.documentElement).getPropertyValue(
                '--accent-color'
            )
        }
    ]
});

toolbarContainerEl.appendChild(toolbar.el);

toolbar.render();
toolbar.on({
    'controls:change': (value) => {
        if (value) {
            addControls(paper);
        } else {
            removeControls(paper);
        }
    },
    'instrumentation:change': (value) => {
        if (value) {
            addCharts(paper);
        } else {
            removeCharts(paper);
        }
    },
    'color:input': (value) => {
        document.documentElement.style.setProperty('--accent-color', value);
    }
});

function addControls(paper) {
    const graph = paper.model;
    graph.getElements().forEach((cell) => {
        switch (cell.get('type')) {
            case 'ControlValve':
                SliderValveControl.add(cell.findView(paper), 'root', 'slider', {
                    name: cell.attr('label/text')
                });
                break;
            case 'HandValve':
                ToggleValveControl.add(cell.findView(paper), 'root', 'button');
                break;
            case 'Pump':
                PumpControl.add(cell.findView(paper), 'root', 'selection');
                break;
        }
    });
}

function removeControls(paper) {
    SliderValveControl.removeAll(paper);
    ToggleValveControl.removeAll(paper);
    PumpControl.removeAll(paper);
}

function addCharts(paper) {
    paper.options.viewport = null;
}

function removeCharts(paper) {
    const chartTypes = ['chart.Knob', 'chart.Plot', 'standard.Link'];
    paper.options.viewport = (view) => {
        return !chartTypes.includes(view.model.get('type'));
    };
}

// Simulation
// A dummy system for the purpose of this demo

tank1.level = START_LIQUID;

let extraLiquid = 0;

setInterval(function() {
    const tank1Level = tank1.level;
    const liquidIn = g.random(0, 15);

    const newLevel = tank1Level + liquidIn;
    if (newLevel >= 100) {
        extraLiquid += newLevel - 100;
    } else {
        extraLiquid = 0;
    }

    // Tank 1 Instrumentation
    tankChart.addPoint(
        { x: tankChart.lastPoint('level').x + 1, y: tank1Level },
        'level',
        { maxLen: maxPoints }
    );

    // Tank 1 Pipes
    const tank1Pipe1Flow = tank1Level > 70 ? 1 : 0;
    const tank1Pipe2Flow = tank1Level > 0 ? 1 : 0;
    tank1Pipe1.set('flow', tank1Pipe1Flow);
    tank1Pipe2.set('flow', tank1Pipe2Flow);

    // CTRL Valve 1
    const ctrlValve1Open = controlValve1.get('open');
    const ctrlValve1Pipe1Flow = tank1Pipe1Flow * ctrlValve1Open;
    ctrlValve1Pipe1.set('flow', ctrlValve1Pipe1Flow);
    // CTRL Valve 2
    const ctrlValve2Open = controlValve2.get('open');
    const ctrlValve2Pipe1Flow = tank1Pipe2Flow * ctrlValve2Open;
    ctrlValve2Pipe1.set('flow', ctrlValve2Pipe1Flow);

    // Pump 1
    const pump1Power = pump1.power;
    const pump1Pipe1Flow = ctrlValve1Pipe1Flow * (1 + 2 * pump1Power);
    pump1Pipe1.set('flow', pump1Pipe1Flow);

    // Pump 2
    const pump2Power = pump2.power;
    const pump2Pipe1Flow = ctrlValve2Pipe1Flow * (1 + 2 * pump2Power);
    pump2Pipe1.set('flow', pump2Pipe1Flow);

    // Hand Valve 2
    const handValve2Open = Number(handValve2.get('open'));
    const handValve2Pipe1Flow = pump1Pipe1Flow * handValve2Open;
    valve2Pipe1.set('flow', handValve2Pipe1Flow);

    // Hand Valve 3
    const handValve3Open = Number(handValve3.get('open'));
    const handValve3Pipe1Flow = pump2Pipe1Flow * handValve3Open;
    valve3Pipe1.set('flow', handValve3Pipe1Flow);

    // Join 1
    const join1Pipe1Flow = handValve2Pipe1Flow + handValve3Pipe1Flow;
    join1Pipe1.set('flow', join1Pipe1Flow);

    // Tank 2
    const tank2Pipe1Flow = 0.5; // constant flow
    tank2Pipe1.set('flow', tank2Pipe1Flow);

    // Hand Valve 1
    const handValve1Open = Number(handValve1.get('open'));
    const handValve1Pipe1Flow = tank2Pipe1Flow * handValve1Open;
    valve1Pipe1.set('flow', handValve1Pipe1Flow);

    // Join 2
    const join2Pipe1Flow = join1Pipe1Flow + handValve1Pipe1Flow;
    join2Pipe1.set('flow', join2Pipe1Flow);

    // Tank1
    const liquidOut = join2Pipe1Flow * 4;
    tank1.level = tank1Level + liquidIn - liquidOut;

    // Gauge 1
    let pressure1 = ctrlValve1Pipe1Flow * 10;
    if (pressure1 > 0) {
        pressure1 += Math.min(30, extraLiquid * Math.max(1.1 - handValve2Open));
        if (handValve2Open === 0) {
            pressure1 += Math.max(0, tank1Level - 70) * 0.3;
        }
    }
    gauge1.transition('value', pressure1 / 10);
    gauge1.transition(
        'fill',
        pressure1 > 30 ? MAX_PRESSURE_COLOR : PRESSURE_COLOR,
        { valueFunction: util.interpolate.hexColor, duration: 1000 }
    );

    // Gauge 2
    let pressure2 = ctrlValve2Pipe1Flow * 10;
    if (pressure2 > 0) {
        pressure2 += Math.min(30, extraLiquid * Math.max(1.1 - handValve3Open));
        if (handValve3Open === 0) {
            pressure2 += tank1Level * 0.3;
        }
    }
    gauge2.transition('value', pressure2 / 10);
    gauge2.transition(
        'fill',
        pressure2 > 30 ? MAX_PRESSURE_COLOR : PRESSURE_COLOR,
        { valueFunction: util.interpolate.hexColor, duration: 1000 }
    );
}, 1000);
