import { useEffect, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Navigator, usePaperScroller, usePaperScrollerViewport } from '@joint/react-plus';
import { Scan, Expand, Shrink, Map } from 'lucide-react';
import { ZOOM_SETTINGS } from '../../configs/navigator-config';
import { MAIN_COLOR } from '../../configs/theme';
import { Tip } from '../ui/tip';

import type { ReactNode } from 'react';

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

export function NavigatorPanel() {

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
                <Navigator
                    className="navigator-minimap"
                    style={{ width: 318, height: 130 }}
                    showLinks={false}
                    padding={10}
                    elementStyle={() => ({
                        fill: MAIN_COLOR,
                        fillOpacity: 0.25,
                        stroke: 'none'
                    })}
                />
            </div>
            <div className="navigator-toolbar">
                <IconButton
                    icon={<Scan size={18} />}
                    tooltip="Fit to screen"
                    onClick={() => zoomToFit({
                        minScale: ZOOM_SETTINGS.min,
                        maxScale: 1,
                        contentMargin: 60
                    })}
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
