/* Constants for adjusting the look and feel of the diagram */

const LANE_CONTENT_MARGIN = 20;
const MIN_LANE_SIZE = 60;

export const DEFAULT_POOL_WIDTH = 400;

export const poolAttributes = {
    headerTextMargin: 5,
    contentMargin: LANE_CONTENT_MARGIN,
    minimumLaneSize: MIN_LANE_SIZE,
};

export const swimlaneAttributes = {
    headerSize: 30,
    headerTextMargin: 5,
    contentMargin: LANE_CONTENT_MARGIN,
};

export const phaseAttributes = {
    headerSize: 30,
    headerTextMargin: 5,
};

export const freeTransformAttributes = {
    theme: 'bpmn',
    resizeGrid: { width: 10, height: 10 },
    minLaneSize: MIN_LANE_SIZE,
};

export const fontAttributes = {
    fontFamily: 'sans-serif',
};
