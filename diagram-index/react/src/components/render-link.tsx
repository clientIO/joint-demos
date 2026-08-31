import { useLinkLayout, useIsCellSelected } from '@joint/react-plus';
import { HIGHLIGHT_COLOR } from '@/theme';

/**
 * Renders one link's selection halo: an extra fat-stroke path following the
 * exact route JointJS computed (`useLinkLayout().d`), mounted into the link's
 * root group only while the link is selected. The line and arrowhead
 * themselves stay JointJS-rendered; this only decorates them.
 */
export function RenderLink() {
    const selected = useIsCellSelected();
    const layout = useLinkLayout();
    if (!selected || !layout) return null;
    return (
        <path
            d={layout.d}
            fill="none"
            stroke={HIGHLIGHT_COLOR}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.3}
            pointerEvents="none"
        />
    );
}
