import { inspectorOptions } from '../shared-config';

export var PoolShapeTypes;
(function (PoolShapeTypes) {
    PoolShapeTypes["HORIZONTAL_POOL"] = "pool.HorizontalPool";
    PoolShapeTypes["VERTICAL_POOL"] = "pool.VerticalPool";
    PoolShapeTypes["HORIZONTAL_SWIMLANE"] = "pool.HorizontalSwimlane";
    PoolShapeTypes["VERTICAL_SWIMLANE"] = "pool.VerticalSwimlane";
})(PoolShapeTypes || (PoolShapeTypes = {}));

export const LANE_CONTENT_MARGIN = 20;
const MIN_LANE_SIZE = 60;
export const DEFAULT_LANE_HEIGHT = 100;
export const SWIMLANE_HEADER_SIZE = 30;

export const DEFAULT_HORIZONTAL_POOL_SIZE = {
    width: 600,
    height: 250,
};

export const DEFAULT_VERTICAL_POOL_SIZE = {
    width: 250,
    height: 600,
};

export const HORIZONTAL_POOL_PADDING = {
    left: 30
};

export const VERTICAL_POOL_PADDING = {
    top: 30
};

export const poolAttributes = {
    headerTextMargin: 5,
    contentMargin: LANE_CONTENT_MARGIN,
    minimumLaneSize: MIN_LANE_SIZE
};

export const swimlaneAttributes = {
    headerSize: SWIMLANE_HEADER_SIZE,
    headerTextMargin: 5,
    contentMargin: LANE_CONTENT_MARGIN,
};

export const poolAppearanceConfig = {
    groups: {
        header: {
            label: 'Header Style',
            index: 1
        },
        body: {
            label: 'Body Style',
            index: 2
        },
        text: {
            label: 'Text',
            index: 3
        }
    },
    inputs: {
        attrs: {
            header: {
                fill: {
                    type: 'color',
                    label: 'Fill',
                    group: 'header',
                    index: 1
                },
                stroke: {
                    type: 'color',
                    label: 'Outline',
                    group: 'header',
                    index: 2
                }
            },
            body: {
                fill: {
                    type: 'color',
                    label: 'Fill',
                    group: 'body',
                    index: 1
                },
                stroke: {
                    type: 'color',
                    label: 'Outline',
                    group: 'body',
                    index: 2
                }
            },
            headerText: {
                fontFamily: {
                    type: 'select-box',
                    label: 'Font style',
                    group: 'text',
                    index: 1,
                    options: inspectorOptions.fontFamily
                },
                fontWeight: {
                    type: 'select-box',
                    label: 'Font Thickness',
                    group: 'text',
                    index: 2,
                    options: inspectorOptions.fontWeight
                },
                fill: {
                    type: 'color',
                    label: 'Color',
                    group: 'text',
                    index: 3
                }
            }
        }
    }
};

export const swimlaneAppearanceConfig = {
    groups: {
        body: {
            label: 'Body Style',
            index: 1
        },
        text: {
            label: 'Text',
            index: 2
        }
    },
    inputs: {
        attrs: {
            body: {
                fill: {
                    type: 'color',
                    label: 'Fill',
                    group: 'body',
                    index: 1
                },
                stroke: {
                    type: 'color',
                    label: 'Outline',
                    group: 'body',
                    index: 2
                }
            },
            headerText: {
                fontFamily: {
                    type: 'select-box',
                    label: 'Font style',
                    group: 'text',
                    index: 1,
                    options: inspectorOptions.fontFamily
                },
                fontWeight: {
                    type: 'select-box',
                    label: 'Font Thickness',
                    group: 'text',
                    index: 2,
                    options: inspectorOptions.fontWeight
                },
                fill: {
                    type: 'color',
                    label: 'Color',
                    group: 'text',
                    index: 3
                }
            }
        }
    }
};
