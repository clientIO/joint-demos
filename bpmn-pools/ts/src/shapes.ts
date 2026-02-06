import { shapes, util } from '@joint/plus';
import { phaseAttributes, poolAttributes, swimlaneAttributes, fontAttributes } from './theme';

export const POOL_HEADER_SIZE = 40;
export const PHASE_HEADER_SIZE = 30; // current default value in shapes.bpmn2

export class HorizontalPool extends shapes.bpmn2.HeaderedHorizontalPool {
    defaults() {
        return util.defaultsDeep({
            ...poolAttributes,
            type: 'custom.HorizontalPool',
            headerSide: 'top',
            padding: { top: POOL_HEADER_SIZE, left: 0 }, // overwrite default `left: 40`
            attrs: {
                header: {
                    stroke: '#000000',
                    fill: '#d3d3d3'
                },
                headerText: {
                    fill: '#333333',
                    ...fontAttributes
                }
            }
        }, super.defaults);
    }

    afterPhasesEmbedded() {
        this.setStackingOrder();
    }
}

export const HorizontalPoolView = shapes.bpmn2.HeaderedHorizontalPoolView;

export class VerticalPool extends shapes.bpmn2.HeaderedVerticalPool {
    defaults() {
        return util.defaultsDeep({
            ...poolAttributes,
            type: 'custom.VerticalPool',
            headerSide: 'left',
            padding: { top: 0, left: POOL_HEADER_SIZE }, // overwrite default `top: 40`
            attrs: {
                header: {
                    stroke: '#000000',
                    fill: '#d3d3d3'
                },
                headerText: {
                    fill: '#333333',
                    ...fontAttributes
                }
            }
        }, super.defaults);
    }

    afterPhasesEmbedded() {
        this.setStackingOrder();
    }
}

export const VerticalPoolView = shapes.bpmn2.HeaderedVerticalPoolView;

export class HorizontalSwimlane extends shapes.bpmn2.HorizontalSwimlane {
    defaults() {
        return util.defaultsDeep({
            ...swimlaneAttributes,
            type: 'custom.HorizontalSwimlane',
            attrs: {
                header: {
                    stroke: '#000000',
                    fill: '#f2f2f2'
                },
                headerText: {
                    fill: '#333333',
                    ...fontAttributes
                }
            }
        }, super.defaults);
    }
}

export const HorizontalSwimlaneView = shapes.bpmn2.HorizontalSwimlaneView;

export class VerticalSwimlane extends shapes.bpmn2.VerticalSwimlane {
    defaults() {
        return util.defaultsDeep({
            ...swimlaneAttributes,
            type: 'custom.VerticalSwimlane',
            attrs: {
                header: {
                    stroke: '#000000',
                    fill: '#f2f2f2'
                },
                headerText: {
                    fill: '#333333',
                    ...fontAttributes
                }
            }
        }, super.defaults);
    }
}

export const VerticalSwimlaneView = shapes.bpmn2.VerticalSwimlaneView;

export class HorizontalPhase extends shapes.bpmn2.HorizontalPhase {
    defaults() {
        return util.defaultsDeep({
            ...phaseAttributes,
            type: 'bpmn.HorizontalPhase',
            attrs: {
                header: {
                    stroke: '#000000',
                    fill: '#f2f2f2'
                },
                headerText: {
                    fill: '#333333',
                    ...fontAttributes
                }
            }
        }, super.defaults);
    }
}

export const HorizontalPhaseView = shapes.bpmn2.HorizontalPhaseView;

export class VerticalPhase extends shapes.bpmn2.VerticalPhase {
    defaults() {
        return util.defaultsDeep({
            ...phaseAttributes,
            type: 'bpmn.VerticalPhase',
            attrs: {
                header: {
                    stroke: '#000000',
                    fill: '#f2f2f2'
                },
                headerText: {
                    fill: '#333333',
                    ...fontAttributes
                }
            }
        }, super.defaults);
    }
}

export const VerticalPhaseView = shapes.bpmn2.VerticalPhaseView;

export class Event extends shapes.bpmn2.Event {
    defaults() {
        return util.defaultsDeep({
            type: 'custom.Event',
            attrs: {
                root: {
                    highlighterSelector: 'border',
                    frameSelector: 'background'
                },
                label: {
                    cursor: 'text',
                    textWrap: {
                        width: 100,
                        height: 60,
                        ellipsis: true
                    }
                }
            }
        }, super.defaults);
    }
}


export class Activity extends shapes.bpmn2.Activity {
    defaults() {
        return util.defaultsDeep({
            type: 'custom.Activity',
            attrs: {
                root: {
                    highlighterSelector: 'border',
                    frameSelector: 'background',
                },
                label: {
                    cursor: 'text',
                    textWrap: {
                        height: -10
                    }
                }
            }
        }, super.defaults);
    }
}

export class Gateway extends shapes.bpmn2.Gateway {
    defaults() {
        return util.defaultsDeep({
            type: 'custom.Gateway',
            attrs: {
                root: {
                    frameSelector: 'body'
                },
                label: {
                    cursor: 'text',
                    textWrap: {
                        width: 100,
                        height: 60,
                        ellipsis: true
                    }
                },
                icon: {
                    iconType: 'exclusive'
                }
            }
        }, super.defaults);
    }
}
