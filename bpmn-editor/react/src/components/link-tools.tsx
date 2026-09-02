import { useEffect } from 'react';
import { dia } from '@joint/plus';
import { usePaper } from '@joint/react-plus';
import { useSelectedCell } from '../hooks/use-selected-cell';

import type { BpmnLink } from '../shapes/shapes-typing';

/**
 * Renders nothing. Shows the link tools (vertices, arrowheads, remove
 * buttons) on the selected link.
 */
export function LinkTools() {

    const { paper } = usePaper();
    const selected = useSelectedCell();

    const link = selected?.isLink() ? selected as BpmnLink : null;

    useEffect(() => {
        if (!paper || !link) return;

        const linkView = paper.findViewByModel(link) as dia.LinkView | null;
        if (!linkView) return;

        const toolsView = new dia.ToolsView({
            tools: link.getLinkTools()
        });
        linkView.addTools(toolsView);

        return () => {
            toolsView.remove();
        };
    }, [paper, link]);

    return null;
}
