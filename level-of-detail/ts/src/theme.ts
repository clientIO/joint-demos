/** How a service is doing. Drives the colour at every level of detail. */
export type ServiceStatus = 'healthy' | 'degraded' | 'down';

export const DARK_COLOR = '#322A49';
export const MUTED_COLOR = '#655E77';
export const CANVAS_COLOR = '#F3F7F6';
export const LINK_COLOR = '#C9CFE8';
export const CARD_BORDER_COLOR = '#E3E6F0';
export const TRACK_COLOR = '#EEF1FD';

export const STATUS_COLOR: Record<ServiceStatus, string> = {
    healthy: '#12B76A',
    degraded: '#F79009',
    down: '#ED2637'
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
    down: '#FBD6D9'
};

/** The soft wash behind a status pill on the card. */
export const STATUS_SOFT: Record<ServiceStatus, string> = {
    healthy: '#E7F7EF',
    degraded: '#FEF3E4',
    down: '#FDEAEC'
};

export const STATUS_LABEL: Record<ServiceStatus, string> = {
    healthy: 'Healthy',
    degraded: 'Degraded',
    down: 'Down'
};
