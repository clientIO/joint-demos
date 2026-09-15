import { dia } from '@joint/plus';
import type { ServiceStatus } from './theme';
import { LINK_COLOR } from './theme';

export const SERVICE_TYPE = 'lod.Service';
export const LINK_TYPE = 'lod.Link';

/**
 * The state of one service. Every level of detail reads from this one record -
 * the card shows all of it, the chip shows the name and the latency, the block
 * shows only the status as a colour.
 *
 * Nothing about the element's rendering is stored here. What an element looks
 * like is decided by the paper's scale, not by the model: the level of detail
 * is view state, and `ServiceView` is the only thing that knows about it.
 */
export interface ServiceData {
    readonly name: string;
    readonly group: string;
    readonly region: string;
    readonly latencyMs: number;
    /** Share of capacity in use, 0-1. Drawn as the bar on the card. */
    readonly load: number;
    readonly status: ServiceStatus;
}

/**
 * One size for all three levels of detail.
 *
 * This is the rule the whole demo rests on: the level of detail changes what an
 * element *draws*, never how big it is. The size lives on the model, so the
 * links, the quad-tree index and the scroller's viewport test all keep working
 * on geometry that never moves - an element that shrank when it dropped to a
 * block would drag every link end with it and reflow the map as you zoomed.
 */
export const NODE_SIZE = { width: 300, height: 96 };

/**
 * A service. No `markup` and no `attrs`: `ServiceView` owns the DOM and builds
 * it per level, so there is nothing here for the default element view to draw.
 */
export const Service = dia.Element.define(SERVICE_TYPE, {
    size: { ...NODE_SIZE }
});

/** The typed `data` of a service element. */
export function getServiceData(element: dia.Element): ServiceData {
    return element.get('data') as ServiceData;
}

/**
 * A call between two services.
 *
 * No arrowhead and no label: a marker is a second path per link, and at the
 * zoom levels where this map is interesting it would be a sub-pixel smudge.
 * The links are drawn by the default link view - the level of detail is a
 * question about elements.
 */
export const Link = dia.Link.define(LINK_TYPE, {
    attrs: {
        line: {
            connection: true,
            stroke: LINK_COLOR,
            strokeWidth: 1,
            fill: 'none'
        }
    }
}, {
    markup: [{ tagName: 'path', selector: 'line' }]
});

export const cellNamespace = {
    lod: { Service, Link }
};
