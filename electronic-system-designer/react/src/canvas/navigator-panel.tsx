// Minimap + zoom cluster, bottom-right: the react-plus <Navigator> (already
// on-theme via the --jj-nav-* CSS variables) with the zoom controls beneath.

import {
    Navigator,
    useImageExport,
    usePaperScroller,
    usePaperScrollerViewport,
} from '@joint/react-plus';
import { Download, Maximize, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { NAV_ELEMENT_STYLE, NAV_LINK_STYLE } from './navigator-style';

const ZOOM_STEP = 1.2;

export function NavigatorPanel() {
    const { setZoom, zoomToFit } = usePaperScroller();
    const zoom = usePaperScrollerViewport((viewport) => viewport.zoom);
    // PNG export lives here (not the toolbar) because it needs the paper of the
    // ACTIVE canvas — this panel is mounted inside the same <Diagram>.
    const [exportImage] = useImageExport({ type: 'image/png', padding: 24 });

    return (
        <div className="chamfer-panel chamfer-frame [--frame-chamfer:var(--chamfer-panel)] flex flex-col gap-1 bg-card p-1.5 shadow-(--panel-shadow)">
            {/* Desktop only — the map needs room to be useful, and on phone/tablet
          widths it costs a quarter of the sheet. Hidden via a WRAPPER div:
          the library's compound `.jj-navigator.*` selector out-specifies the
          single-class `hidden` utility on the element itself. */}
            <div className="hidden lg:block">
                <Navigator
                    className="h-28 w-48"
                    elementStyle={NAV_ELEMENT_STYLE}
                    linkStyle={NAV_LINK_STYLE}
                />
            </div>
            <div className="flex items-center gap-0.5">
                <Tooltip label="Zoom out">
                    <Button size="icon" aria-label="Zoom out" onClick={() => setZoom(zoom / ZOOM_STEP)}>
                        <Minus className="size-4" aria-hidden />
                    </Button>
                </Tooltip>
                <span className="min-w-12 text-center font-mono text-xs tabular-nums text-muted-foreground">
                    {Math.round(zoom * 100)}%
                </span>
                <Tooltip label="Zoom in">
                    <Button size="icon" aria-label="Zoom in" onClick={() => setZoom(zoom * ZOOM_STEP)}>
                        <Plus className="size-4" aria-hidden />
                    </Button>
                </Tooltip>
                <Tooltip label="Fit diagram">
                    <Button
                        size="icon"
                        aria-label="Fit diagram"
                        onClick={() => zoomToFit({ padding: 48, maxScale: 1.25 })}
                    >
                        <Maximize className="size-4" aria-hidden />
                    </Button>
                </Tooltip>
                <Tooltip label="Export sheet as PNG">
                    <Button
                        size="icon"
                        aria-label="Export sheet as PNG"
                        onClick={() => void exportImage({ downloadAs: 'system-designer' })}
                    >
                        <Download className="size-4" aria-hidden />
                    </Button>
                </Tooltip>
            </div>
        </div>
    );
}
