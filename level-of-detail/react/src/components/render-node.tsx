import { usePaperScrollerViewport } from '@joint/react-plus';
import type { NodeData } from '@/data/cells';
import { selectDetailLevel } from '@/detail';
import { useDetailMode } from '@/detail-context';
import { ServiceBlock } from './service-block';
import { ServiceCard } from './service-card';
import { ServiceChip } from './service-chip';

/**
 * One node of the service map — and the level-of-detail switch itself.
 *
 * Virtual rendering decides how many nodes are mounted; this decides how much
 * each mounted one draws. The two are independent and they compose: framing the
 * whole map defeats virtual rendering (every node really is in the viewport)
 * and leaves this as the only thing standing between 1,200 elements and a
 * frozen tab.
 *
 * `usePaperScrollerViewport(selectDetailLevel)` is the entire subscription. The
 * selector returns one of three strings, so the hook's `Object.is` comparison
 * bails out for every zoom change that stays inside a band: a node re-renders
 * when it crosses 60% or 25%, and at no other point during a pinch or a wheel
 * spin. Subscribing to the raw `zoom` would re-render every mounted node on
 * every frame — the opposite of what this is for.
 *
 * `renderElement` hands over the element's `data` slice and nothing else, so
 * this never re-runs when the paper pans: JointJS moves the rendered node
 * itself, without React.
 */
export function RenderNode(data: NodeData) {
    const level = usePaperScrollerViewport(selectDetailLevel);
    const mode = useDetailMode();
    // The toolbar can pin a level, to show what the other two are worth. `auto`
    // — the real behaviour — follows the zoom.
    const effective = mode === 'auto' ? level : mode;

    switch (effective) {
        case 'high': return <ServiceCard {...data} />;
        case 'medium': return <ServiceChip {...data} />;
        default: return <ServiceBlock {...data} />;
    }
}
