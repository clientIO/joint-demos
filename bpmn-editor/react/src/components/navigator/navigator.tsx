import { useEffect, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Navigator as NavigatorMinimap, usePaperScroller, usePaperScrollerViewport } from '@joint/react-plus';
import { Scan, Expand, Shrink, Map } from 'lucide-react';
import { ZOOM_SETTINGS } from '../../configs/paper-config';
import { isEvent, isGateway, isPool, isSwimlane } from '../../utils';
import { Tip } from '../tooltip/tooltip';

import type { ReactNode } from 'react';
import './navigator.css';

/**
 * A tooltipped toolbar icon button.
 */
function IconButton({ icon, tooltip, active, onClick }: {
    icon: ReactNode;
    tooltip: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <Tip label={tooltip}>
            <button
                type="button"
                className={`navigator-icon-button${active ? ' active' : ''}`}
                onClick={onClick}
            >
                {icon}
            </button>
        </Tip>
    );
}

/**
 * The minimap panel: fit-to-screen, fullscreen toggle, zoom slider and the
 * minimap visibility toggle.
 */
export function Navigator() {

    const { zoomToFit, setZoom } = usePaperScroller();
    const { zoom } = usePaperScrollerViewport();

    const [isMinimapVisible, setIsMinimapVisible] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    };

    const zoomPercentage = Math.round(zoom * 100);

    return (
        <div className="navigator-container">
            {/* The wrapper animates collapse/expand — the Navigator host keeps
                a fixed size, otherwise the component refits to the animated
                (collapsed) size and distorts the minimap. */}
            <div className={`navigator-minimap-wrapper${isMinimapVisible ? '' : ' hidden'}`}>
                <NavigatorMinimap
                    className="navigator-minimap"
                    style={{ width: 318, height: 130 }}
                    showLinks={false}
                    padding={10}
                    elementStyle={({ model, width, height }) => {
                        if (isPool(model) || isSwimlane(model)) {
                            return {
                                // Containers render as outlines
                                fill: 'transparent',
                                stroke: 'var(--bpmn-navigator-element-color)'
                            };
                        }
                        const style = {
                            fill: 'var(--bpmn-navigator-element-color)',
                            fillOpacity: 0.4,
                            stroke: 'none'
                        };
                        // Mirror the shape geometry: events are circles,
                        // gateways rhombi (`d` overrides the default rect).
                        if (isEvent(model)) {
                            const [rx, ry] = [width / 2, height / 2];
                            return { ...style, d: `M 0 ${ry} A ${rx} ${ry} 0 1 0 ${width} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} Z` };
                        }
                        if (isGateway(model)) {
                            return { ...style, d: `M ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} L 0 ${height / 2} Z` };
                        }
                        return style;
                    }}
                />
            </div>
            <div className="navigator-toolbar">
                <IconButton
                    icon={<Scan size={18} />}
                    tooltip="Fit to screen"
                    onClick={() => zoomToFit({ maxScale: 1, contentMargin: 60 })}
                />
                <IconButton
                    icon={isFullscreen ? <Shrink size={18} /> : <Expand size={18} />}
                    tooltip={isFullscreen ? 'Exit full screen' : 'Toggle full screen'}
                    onClick={toggleFullscreen}
                />
                <div className="navigator-zoom-slider">
                    <Slider.Root
                        className="zoom-slider-root"
                        min={ZOOM_SETTINGS.min * 100}
                        max={ZOOM_SETTINGS.max * 100}
                        step={10}
                        value={[zoomPercentage]}
                        onValueChange={([value]) => setZoom(value / 100)}
                    >
                        <Slider.Track className="zoom-slider-track">
                            <Slider.Range className="zoom-slider-range" />
                        </Slider.Track>
                        <Slider.Thumb className="zoom-slider-thumb" aria-label="Zoom" />
                    </Slider.Root>
                    <output>{zoomPercentage}%</output>
                </div>
                <div className="navigator-separator" />
                <IconButton
                    icon={<Map size={18} />}
                    tooltip={isMinimapVisible ? 'Hide minimap' : 'Show minimap'}
                    active={isMinimapVisible}
                    onClick={() => setIsMinimapVisible((visible) => !visible)}
                />
            </div>
        </div>
    );
}
