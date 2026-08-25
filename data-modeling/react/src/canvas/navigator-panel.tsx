// Combined minimap + zoom controls, bottom-right — one panel like the
// ai-workflow-builder's NavigatorPanel: a collapsible themed minimap on top and a
// control bar below (collapse toggle, zoom-out, slider, zoom-in, %, fit-to-screen).
//
// The minimap mirrors the main paper but with our own theming (cells tinted with
// the design tokens, not the default white) and the SAME collapse-aware
// visibility so collapsed groups' children never linger in the map.

import { useState } from 'react';
import { ChevronDown, Map, Maximize2, Minus, Plus } from 'lucide-react';
import {
    Navigator,
    useGraph,
    usePaperScroller,
    usePaperScrollerViewport,
    type NavigatorElementStyleCallback,
    type NavigatorProps,
} from '@joint/react-plus';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/utils/cn';
import { isGroupCell, isNoteCell, type ElementCellData } from '@/model/cell-data';
import { swatchColor } from '@/appearance/swatches';
import { isCellVisibleUnderCollapse } from './use-container-resize';
import { FIT_MIN_ZOOM, MAX_ZOOM, transitionToContent } from './fit-content';

// The scroller owns the clamping now (<PaperScroller minZoom/maxZoom> in
// canvas.tsx uses the SAME bounds), so this panel only maps zoom <-> slider
// ticks — no local clamp.
const MIN_ZOOM = FIT_MIN_ZOOM;
const STEP = 0.2;
// The slider works in integer ticks (0..TICKS) mapped onto MIN_ZOOM..MAX_ZOOM.
const TICKS = 100;

const zoomToTick = (zoom: number): number =>
    Math.round(((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * TICKS);
const tickToZoom = (tick: number): number => MIN_ZOOM + (tick / TICKS) * (MAX_ZOOM - MIN_ZOOM);

// Minimap theming: honor each node's OWN chosen swatch, but as a SOFT tint (not the
// raw, full-saturation swatch), so the map reads like a muted echo of the board
// instead of a grid of loud color blocks. `swatchColor` returns the raw color
// (`var(--color-…-500)`); we mix it over the neutral surface at roughly the same low
// ratio the board's own cards use (~16%), with a stronger mix for the outline. The
// navigator applies these as inline CSS, so `color-mix()` / `var()` resolve.
const tint = (base: string, color: string, percent: number): string =>
    `color-mix(in oklab, ${base}, ${color} ${percent}%)`;

const MINIMAP_ELEMENT_STYLE: NavigatorElementStyleCallback<ElementCellData> = ({ record }) => {
    const data = record.data;
    const swatch = 'fill' in data && data.fill && data.fill !== 'default' ? swatchColor(data.fill) : undefined;
    if (isGroupCell(data)) {
    // A group's color is its fill, else its badge. Groups are large background regions,
    // so keep the fill especially faint; the color reads mostly through the outline.
        const color = swatch ?? (data.badge && data.badge !== 'default' ? swatchColor(data.badge) : undefined);
        return color
            ? { fill: tint('var(--group-fill)', color, 12), stroke: tint('var(--group-stroke)', color, 45), rx: 5, ry: 5 }
            : { fill: 'var(--group-fill)', stroke: 'var(--group-stroke)', rx: 5, ry: 5 };
    }
    if (isNoteCell(data)) return { fill: 'var(--note-surface)', stroke: 'var(--note-border)', rx: 3, ry: 3 };
    return swatch
        ? { fill: tint('var(--card)', swatch, 18), stroke: tint('var(--card)', swatch, 50), rx: 3, ry: 3 }
        : { fill: 'var(--card)', stroke: 'var(--border)', rx: 3, ry: 3 };
};

const MINIMAP_LINK_STYLE = () => ({ stroke: 'var(--muted-foreground)', strokeWidth: 1 });

// Give the minimap paper the SAME collapse-aware visibility as the main paper
// (native `(model) => boolean` form) so collapsed cells don't linger.
const MINIMAP_OPTIONS: NonNullable<NavigatorProps['options']> = {
    paperOptions: { cellVisibility: (model) => isCellVisibleUnderCollapse(model) },
};

export function NavigatorPanel() {
    const scroller = usePaperScroller();
    const { setZoom } = scroller;
    const { graph } = useGraph();
    // Primitive selectors so this panel re-renders only when zoom / the zoom-limit flags
    // change — NOT on every pan frame (a bare `usePaperScrollerViewport()` returns a fresh
    // viewport object each scroll and would re-render the whole panel while dragging).
    const zoom = usePaperScrollerViewport((viewport) => viewport.zoom);
    const canZoomIn = usePaperScrollerViewport((viewport) => viewport.canZoomIn);
    const canZoomOut = usePaperScrollerViewport((viewport) => viewport.canZoomOut);
    // Start collapsed on phones (the minimap is too large there); open on desktop.
    const [mapOpen, setMapOpen] = useState(() => window.innerWidth >= 1024);
    const percent = Math.round(zoom * 100);

    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card node-elevation">
            {/* Collapsible minimap: animates grid-rows 0fr→1fr; sits behind the bar. */}
            <div
                className={cn(
                    'relative z-0 overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out grid',
                    mapOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
            >
                <div className="overflow-hidden">
                    {/* Fill the card width (which the control bar below drives) and CENTER the
              minimap paper inside. The minimap sizes itself to the diagram's content
              bbox, so it's usually narrower than the card; left-aligned it left a blank
              strip on the right. Centering makes any letterbox symmetric — reads as
              intentional matting, not a gap. */}
                    <Navigator<ElementCellData>
                        zoom
                        className="flex h-20 w-full items-center justify-center border-b border-border/60 sm:h-28"
                        elementStyle={MINIMAP_ELEMENT_STYLE}
                        linkStyle={MINIMAP_LINK_STYLE}
                        options={MINIMAP_OPTIONS}
                    />
                </div>
            </div>

            {/* Control bar (opaque, above the map so the map tucks behind it). */}
            <div className="relative z-10 flex items-center gap-0.5 bg-card px-1.5 py-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    aria-label={mapOpen ? 'Hide minimap' : 'Show minimap'}
                    aria-expanded={mapOpen}
                    onClick={() => setMapOpen((open) => !open)}
                >
                    {mapOpen ? <ChevronDown className="size-3.5" /> : <Map className="size-3.5" />}
                </Button>
                <div className="mx-0.5 h-3.5 w-px shrink-0 bg-border" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    aria-label="Zoom out"
                    disabled={!canZoomOut}
                    onClick={() => setZoom((previous) => previous - STEP)}
                >
                    <Minus className="size-3.5" />
                </Button>
                <Slider
                    className="w-16 sm:w-20"
                    aria-label="Zoom level"
                    aria-valuetext={`${percent}%`}
                    min={0}
                    max={TICKS}
                    step={1}
                    value={[zoomToTick(zoom)]}
                    onValueChange={([tick]) => {
                        if (tick !== undefined) setZoom(tickToZoom(tick));
                    }}
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    aria-label="Zoom in"
                    disabled={!canZoomIn}
                    onClick={() => setZoom((previous) => previous + STEP)}
                >
                    <Plus className="size-3.5" />
                </Button>
                <span
                    // Visual only: the Slider's aria-valuetext already announces the zoom on
                    // change, so a second live region would double-speak it.
                    aria-hidden
                    className="w-9 shrink-0 text-center font-mono text-[11px] tabular-nums text-muted-foreground"
                >
                    {percent}%
                </span>
                <div className="mx-0.5 h-3.5 w-px shrink-0 bg-border" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    aria-label="Fit to screen"
                    onClick={() => transitionToContent(scroller, graph)}
                >
                    <Maximize2 className="size-3.5" />
                </Button>
            </div>
        </div>
    );
}
