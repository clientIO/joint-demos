import { mvc, ui } from '@joint/plus';
import type { ZoomSettings } from './types';

const IconButton = ui.widgets.button.extend({
    render: function() {
        this.el.style.display = 'inline-block';
        this.setIcon(this.options.icon);
        this.setTooltip(this.options.tooltip);
        return this;
    },
    setIcon: function(icon = '') {
        if (!icon) {
            this.el.innerHTML = '';
        } else {
            this.el.innerHTML = icon;
        }
    },
    setTooltip: function(text = '') {
        if (text) {
            this.el.dataset.tooltip = text;
        } else {
            delete this.el.dataset.tooltip;
        }
    }
});

export function initializeToolbar(scroller: ui.PaperScroller, zoomSettings: ZoomSettings) {
    const theme = 'custom';
    const toolbar = new ui.Toolbar({
        theme,
        tools: [
            {
                theme,
                type: 'icon-button',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-fullscreen-icon lucide-fullscreen"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="10" height="8" x="7" y="8" rx="1"/></svg>',
                name: 'zoom-to-fit',
                tooltip: 'Zoom to Fit',
            },
            {
                theme,
                type: 'icon-button',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zoom-in-icon lucide-zoom-in"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>',
                name: 'zoom-in',
                tooltip: 'Zoom In',
            },
            {
                theme,
                type: 'icon-button',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zoom-out-icon lucide-zoom-out"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>',
                name: 'zoom-out',
                tooltip: 'Zoom Out',
            },
        ],
        widgetNamespace: {
            ...ui.widgets,
            iconButton: IconButton
        }
    });

    toolbar.render();
    toolbar.el.style.position = 'absolute';
    toolbar.el.style.top = '10px';
    toolbar.el.style.left = '10px';

    const listener = new mvc.Listener();
    listener.listenTo(toolbar, {
        'zoom-to-fit:pointerclick': () => {
            scroller.zoomToFit({
                useModelGeometry: true,
                minScale: zoomSettings.min,
                maxScale: zoomSettings.max,
                padding: zoomSettings.padding
            });
        },
        'zoom-in:pointerclick': () => {
            scroller.zoom(zoomSettings.step, { max: zoomSettings.max });
        },
        'zoom-out:pointerclick': () => {
            scroller.zoom(-zoomSettings.step, { min: zoomSettings.min });
        }
    });
    return { toolbar, listener };
}
