import type { dia } from '@joint/plus';
import { ui } from '@joint/plus';

/** Default URL for navigator icons */
const defaultIconUrl = '.';

/**
 * A button widget that displays an icon and a tooltip.
 * */
class IconButton extends ui.widgets.button {
    render() {
        const size = this.options.size || 20;
        const imageEl = document.createElement('img');
        imageEl.style.width = `${size}px`;
        imageEl.style.height = `${size}px`;
        this.el.appendChild(imageEl);
        this.setIcon(this.options.icon);
        this.setTooltip(this.options.tooltip);
        return this;
    }

    setIcon(icon: string = '') {
        this.el.querySelector('img')!.src = icon;
    }

    setTooltip(tooltip: string = '') {
        this.el.dataset.tooltip = tooltip;
    }
}

/**
 * Zoom options for the navigator toolbar.
 */
export interface NavigatorZoomOptions {
    min: number;
    max: number;
    step: number;
}

/**
 * Options for the Navigator feature.
 */
export interface NavigatorOptions {
    containerEl: HTMLElement;
    paperScroller: ui.PaperScroller;
    paperOptions?: dia.Paper.Options;
    zoom?: NavigatorZoomOptions;
    iconUrl?: string;
}

/**
 * Navigator feature that provides a minimap and toolbar for diagram navigation.
 */
export default class Navigator {
    el: HTMLElement;
    toolbar: ui.Toolbar;
    minimap: ui.Navigator;
    scroller: ui.PaperScroller;
    options: NavigatorOptions;
    abortController: AbortController;

    transitionCanceled = false;

    constructor(options: NavigatorOptions) {
        const { paperScroller } = options;
        this.options = options;
        this.scroller = paperScroller;

        // Create wrapper element
        const el = document.createElement('div');
        el.classList.add('navigator');
        options.containerEl.appendChild(el);
        this.el = el;

        this.toolbar = this.renderToolbar();
        this.minimap = this.renderMinimap();

        // Initial state
        this.updateToolbarButtons();
        this.showMinimap();

        // Listen to fullscreen changes to update the toolbar button
        this.abortController = new AbortController();
        document.addEventListener('fullscreenchange', () => this.updateToolbarButtons(), {
            signal: this.abortController.signal
        });
    }

    renderToolbar() {
        const {
            zoom,
            paperScroller,
            iconUrl = defaultIconUrl
        } = this.options;

        const zoomOptions: NavigatorZoomOptions = {
            min: 0.1,
            max: 3,
            step: 10,
            ...zoom
        };

        const toolbar = new ui.Toolbar({
            autoToggle: true,
            references: {
                paperScroller
            },
            tools: [
                {
                    type: 'icon-button',
                    name: 'fullscreen'
                    /* icon and tooltip are set in updateToolbarButtons() */
                },
                {
                    type: 'icon-button',
                    name: 'fit-to-screen',
                    icon: `${iconUrl}/fit-to-screen.svg`,
                    tooltip: 'Fit to screen'
                },
                {
                    type: 'zoom-slider',
                    min: zoomOptions.min * 100,
                    max: zoomOptions.max * 100,
                    step: zoomOptions.step,
                    attrs: { input: { 'data-tooltip': 'Slide to zoom' }}
                },
                { type: 'separator' },
                {
                    type: 'icon-button',
                    name: 'minimap',
                    icon: `${iconUrl}/minimap.svg`,
                }
            ],
            widgetNamespace: {
                ...ui.widgets,
                iconButton: IconButton
            }
        });

        toolbar.render();
        this.el.appendChild(toolbar.el);

        toolbar.on('fit-to-screen:pointerclick', () => this.fitToScreen());
        toolbar.on('fullscreen:pointerclick', () => this.toggleFullscreen());
        toolbar.on('minimap:pointerclick', () => this.toggleMinimap());

        return toolbar;
    }

    renderMinimap() {
        const {
            paperScroller,
        } = this.options;

        const minimap = new ui.Navigator({
            paperScroller,
            width: 340,
            height: 180,
            padding: 10,
            zoom: false,
            useContentBBox: { useModelGeometry: true },
            dynamicZoom: true,
            paperOptions: {
                ...this.options.paperOptions,
                async: true,
                autoFreeze: true,
                overflow: true,
                defaultConnectionPoint: {
                    name: 'rectangle',
                    args: { useModelGeometry: true }
                },
                defaultAnchor: {
                    name: 'perpendicular',
                    args: { useModelGeometry: true }
                },
                viewManagement: true,
                background: {
                    color: 'transparent'
                }
            }
        });

        minimap.el.addEventListener('transitionend', () => {
            if (this.transitionCanceled) return;
            minimap.updateCurrentView();
            if (this.isMinimapVisible()) {
                minimap.unfreeze();
            } else {
                minimap.freeze();
            }
        });

        minimap.el.addEventListener('transitioncancel', () => {
            this.transitionCanceled = true;
        });

        minimap.render();
        this.el.prepend(minimap.el);

        return minimap;
    }


    isMinimapVisible() {
        return !this.minimap?.el.classList.contains('hidden');
    }

    fitToScreen() {
        this.scroller.zoomToFit({ useModelGeometry: true, padding: 20 });
    }

    toggleFullscreen() {
        const fullScreenEl = this.toolbar.getWidgetByName('fullscreen').el;

        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            fullScreenEl.classList.add('active');
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
            fullScreenEl.classList.remove('active');
        }
    }

    showMinimap() {
        this.minimap.el.classList.remove('hidden');
        this.transitionCanceled = false;
    }

    hideMinimap() {
        this.minimap.el.classList.add('hidden');
    }

    toggleMinimap(visible?: boolean) {
        let isVisible;
        if (typeof visible === 'boolean') {
            isVisible = visible;
        } else {
            isVisible = this.isMinimapVisible();
        }
        if (isVisible) {
            this.hideMinimap();
        } else {
            this.showMinimap();
        }
        this.updateToolbarButtons();
    }

    updateToolbarButtons() {
        const { iconUrl = defaultIconUrl } = this.options;

        // Minimap
        const minimapButton = this.toolbar.getWidgetByName('minimap') as IconButton;
        if (this.isMinimapVisible()) {
            minimapButton.setTooltip('Hide minimap');
            minimapButton.el.classList.add('active');
        } else {
            minimapButton.setTooltip('Show minimap');
            minimapButton.el.classList.remove('active');
        }
        // Full screen
        const fullscreenButton = this.toolbar.getWidgetByName('fullscreen') as IconButton;
        if (document.fullscreenElement) {
            fullscreenButton.setIcon(`${iconUrl}/exit-fullscreen.svg`);
            fullscreenButton.setTooltip('Exit full screen');
        } else {
            fullscreenButton.setIcon(`${iconUrl}/request-fullscreen.svg`);
            fullscreenButton.setTooltip('Toggle full screen');
        }
    }

    remove() {
        this.toolbar.remove();
        this.minimap.remove();
        this.abortController.abort();
    }
}
