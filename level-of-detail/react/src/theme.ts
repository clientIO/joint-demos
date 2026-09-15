/**
 * The palette values that have to exist in TypeScript.
 *
 * The paper background is a `<Paper>` prop, the links are SVG cells whose
 * colour is baked into the cell records, and the medium/low detail levels are
 * SVG too — none of those can read a CSS variable. The high-detail card is
 * HTML and styled in `index.css`, where these values are mirrored.
 */
export const MAIN_COLOR = '#4D64DD';
export const DARK_COLOR = '#322A49';
export const CANVAS_COLOR = '#F3F7F6';
export const LINK_COLOR = '#C9CFE8';

/** How a service is doing. Drives the colour at every level of detail. */
export type ServiceStatus = 'healthy' | 'degraded' | 'down';

export const STATUS_COLOR: Record<ServiceStatus, string> = {
    healthy: '#12B76A',
    degraded: '#F79009',
    down: '#ED2637',
};

/**
 * The fill of a block at the lowest level of detail.
 *
 * A tint rather than the full status colour: zoomed out the blocks tile the
 * screen, and at full saturation the map reads as a wall of colour instead of
 * as a diagram with a few things wrong in it.
 */
export const STATUS_TINT: Record<ServiceStatus, string> = {
    healthy: '#D6F2E4',
    degraded: '#FCE8CD',
    down: '#FBD6D9',
};

export const STATUS_LABEL: Record<ServiceStatus, string> = {
    healthy: 'Healthy',
    degraded: 'Degraded',
    down: 'Down',
};
