import { useCallback, useEffect, useState } from 'react';
import { usePaper, usePaperScrollerViewport } from '@joint/react-plus';
import { DETAIL_LABEL, selectDetailLevel } from '@/detail';
import { useDetailMode } from '@/detail-context';

interface Counts {
    readonly elements: number;
    readonly links: number;
    readonly nodes: number;
}

const EMPTY_COUNTS: Counts = { elements: 0, links: 0, nodes: 0 };

/**
 * The readout in the corner of the canvas: zoom, the level in force, and the
 * counts this demo is actually about.
 *
 * `Elements` and `Links` are what virtual rendering and `cellVisibility`
 * control: the first falls from 1,200 at `Fit` to a couple of dozen at 200%,
 * and the second drops to 0 below 25%, where the links are not drawn at all.
 * `DOM nodes` is what the level of detail controls - the same elements are one
 * `<rect>` each as blocks and a whole HTML card each at the top.
 *
 * Pinning a level at `Fit` moves the node count by an order of magnitude while
 * the element count does not budge, which is the point: the mechanisms are
 * independent, and only the level of detail still has anything to give once the
 * whole map is on screen.
 *
 * Two separate viewport subscriptions rather than one destructured object. A
 * bare `usePaperScrollerViewport()` hands back a fresh object on every scroll
 * frame, so the HUD would re-render on every pixel of a pan; selecting `zoom`
 * and selecting the level are both `Object.is`-comparable, and the level one
 * fires twice in the whole zoom range.
 */
export function Hud() {
    const zoom = usePaperScrollerViewport((viewport) => viewport.zoom);
    const level = usePaperScrollerViewport(selectDetailLevel);
    const mode = useDetailMode();
    const { paper } = usePaper();
    const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);

    const effective = mode === 'auto' ? level : mode;

    const recount = useCallback(() => {
        if (!paper) return;
        setCounts({
            elements: paper.el.querySelectorAll('.joint-element').length,
            links: paper.el.querySelectorAll('.joint-link').length,
            // Everything inside a cell view, links included — so the three
            // numbers add up rather than describing different subsets.
            nodes: paper.el.querySelectorAll('.joint-element *, .joint-link *').length,
        });
    }, [paper]);

    // Counted off paper events rather than on a timer, so the numbers are only
    // ever read right after the DOM they describe settled. Both events are
    // needed: `render:done` only fires when views were *updated*, so a pass
    // that merely unmounts cells that left the viewport — most of what zooming
    // out does — is silent, and `render:idle` is what covers it.
    useEffect(() => {
        if (!paper) return;
        recount();
        paper.on('render:done render:idle', recount);
        return () => {
            paper.off('render:done render:idle', recount);
        };
    }, [paper, recount]);

    /*
     * Changing level is a React re-render and nothing else.
     *
     * Every mounted node swaps component — new DOM inside the portals — but no
     * cell changed, so the paper schedules no update and neither `render:done`
     * nor `render:idle` fires. Pinning a level is the pure case: the zoom does
     * not move, so without this the counts would still describe the level
     * before. (The TypeScript version gets the event for free, because there a
     * level change goes through `requestUpdate()`.)
     *
     * React has committed every portal's DOM by the time an effect runs, so the
     * count taken here is of the markup that is now on screen.
     */
    useEffect(recount, [effective, recount]);

    return (
        <dl className="hud">
            <div className="hud-item">
                <dt>Zoom</dt>
                <dd>{Math.round(zoom * 100)}%</dd>
            </div>
            <div className="hud-item">
                <dt>Rendering</dt>
                <dd className={`hud-level is-${effective}`}>
                    {DETAIL_LABEL[effective]}
                    {mode === 'auto' ? '' : ' (pinned)'}
                </dd>
            </div>
            <div className="hud-item">
                <dt>Elements</dt>
                <dd>{counts.elements.toLocaleString()}</dd>
            </div>
            <div className="hud-item">
                <dt>Links</dt>
                <dd>{counts.links.toLocaleString()}</dd>
            </div>
            <div className="hud-item">
                <dt>DOM nodes</dt>
                <dd>{counts.nodes.toLocaleString()}</dd>
            </div>
        </dl>
    );
}
