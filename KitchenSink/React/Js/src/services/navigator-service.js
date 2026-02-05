import { dia, ui, util } from '@joint/plus';
export const ZOOM_SETTINGS = {
    min: 0.2,
    max: 2
};
const baseUrl = 'assets/navigator';
const IconButton = ui.widgets.button.extend({
    render: function () {
        const size = this.options.size || 20;
        const imageEl = document.createElement('img');
        imageEl.style.width = `${size}px`;
        imageEl.style.height = `${size}px`;
        this.el.appendChild(imageEl);
        this.setIcon(this.options.icon);
        this.setTooltip(this.options.tooltip);
        return this;
    },
    setIcon: function (icon = '') {
        this.el.querySelector('img').src = icon;
    },
    setTooltip: function (tooltip = '') {
        this.el.dataset.tooltip = tooltip;
    }
});
// Simplified navigator element view
const UpdateFlags = {
    Render: '@render',
    Update: '@update',
    Transform: '@transform'
};
const NavigatorElementView = dia.ElementView.extend({
    body: null,
    markup: util.svg /* xml */ `<path @selector="body" opacity="0.4" />`,
    // updates run on view initialization
    initFlag: [UpdateFlags.Render, UpdateFlags.Update, UpdateFlags.Transform],
    // updates run when the model attribute changes
    presentationAttributes: {
        position: [UpdateFlags.Transform],
        angle: [UpdateFlags.Transform],
        size: [UpdateFlags.Update], // shape
    },
    // calls in an animation frame after a multiple changes
    // has been made to the model
    confirmUpdate: function (flags) {
        if (this.hasFlag(flags, UpdateFlags.Render))
            this.render();
        if (this.hasFlag(flags, UpdateFlags.Update))
            this.update();
        // using the original `updateTransformation()` method
        if (this.hasFlag(flags, UpdateFlags.Transform))
            this.updateTransformation();
    },
    render: function () {
        const doc = util.parseDOMJSON(this.markup);
        this.body = doc.selectors.body;
        this.body.classList.add(this.model.get('group'));
        this.el.appendChild(doc.fragment);
    },
    update: function () {
        const { model, body } = this;
        // shape
        const { width, height } = model.size();
        const d = `M 0 0 H ${width} V ${height} H 0 Z`;
        body.setAttribute('d', d);
    }
});
export class NavigatorService {
    constructor(element) {
        this.element = element;
        this.transitionCanceled = false;
    }
    create(scroller) {
        this.scroller = scroller;
        this.toolbar = new ui.Toolbar({
            autoToggle: true,
            references: {
                paperScroller: scroller
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
                    icon: `${baseUrl}/fit-to-screen.svg`,
                    tooltip: 'Fit to screen'
                },
                {
                    type: 'zoom-slider',
                    min: ZOOM_SETTINGS.min * 100,
                    max: ZOOM_SETTINGS.max * 100,
                    step: 10,
                    attrs: { input: { 'data-tooltip': 'Slide to zoom' } }
                },
                { type: 'separator' },
                {
                    type: 'icon-button',
                    name: 'minimap',
                    icon: `${baseUrl}/minimap.svg`,
                }
            ],
            widgetNamespace: Object.assign(Object.assign({}, ui.widgets), { iconButton: IconButton })
        });
        this.toolbar.render();
        this.updateToolbarButtons();
        this.element.appendChild(this.toolbar.el);
        this.toolbar.on('fit-to-screen:pointerclick', () => this.fitToScreen());
        this.toolbar.on('fullscreen:pointerclick', () => this.toggleFullscreen());
        this.toolbar.on('minimap:pointerclick', () => this.toggleMinimap());
        document.addEventListener('fullscreenchange', () => this.updateToolbarButtons());
        this.navigator = new ui.Navigator({
            paperScroller: this.scroller,
            width: 340,
            height: 130,
            padding: 10,
            zoom: false,
            useContentBBox: true,
            paperOptions: {
                async: true,
                autoFreeze: true,
                sorting: dia.Paper.sorting.APPROX,
                elementView: NavigatorElementView,
                cellViewNamespace: {},
                viewManagement: {
                    disposeHidden: true,
                },
                // Don't render links in the navigator
                cellVisibility: (cell) => !cell.isLink(),
                background: {
                    color: 'transparent'
                }
            }
        });
        this.navigator.el.addEventListener('transitionend', () => {
            if (this.transitionCanceled)
                return;
            this.navigator.updateCurrentView();
        });
        this.navigator.el.addEventListener('transitioncancel', () => {
            this.transitionCanceled = true;
        });
        this.element.prepend(this.navigator.el);
        this.navigator.render();
        this.toolbar.getWidgetByName('minimap').el.classList.add('active');
    }
    isMinimapVisible() {
        var _a;
        return !((_a = this.navigator) === null || _a === void 0 ? void 0 : _a.el.classList.contains('hidden'));
    }
    fitToScreen() {
        this.scroller.zoomToFit({ useModelGeometry: true, padding: 20 });
    }
    toggleFullscreen() {
        const fullScreenEl = this.toolbar.getWidgetByName('fullscreen').el;
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            fullScreenEl.classList.add('active');
        }
        else if (document.exitFullscreen) {
            document.exitFullscreen();
            fullScreenEl.classList.remove('active');
        }
    }
    showMinimap() {
        this.navigator.el.classList.remove('hidden');
        this.transitionCanceled = false;
    }
    hideMiniMap() {
        this.navigator.el.classList.add('hidden');
    }
    toggleMinimap() {
        const minimapEl = this.toolbar.getWidgetByName('minimap').el;
        if (this.isMinimapVisible()) {
            this.hideMiniMap();
            minimapEl.classList.remove('active');
        }
        else {
            this.showMinimap();
            minimapEl.classList.add('active');
        }
        this.updateToolbarButtons();
    }
    updateToolbarButtons() {
        // Minimap
        const minimapButton = this.toolbar.getWidgetByName('minimap');
        if (this.isMinimapVisible()) {
            minimapButton.setTooltip('Hide minimap');
        }
        else {
            minimapButton.setTooltip('Show minimap');
        }
        // Full screen
        const fullscreenButton = this.toolbar.getWidgetByName('fullscreen');
        if (document.fullscreenElement) {
            fullscreenButton.setIcon(`${baseUrl}/exit-fullscreen.svg`);
            fullscreenButton.setTooltip('Exit full screen');
        }
        else {
            fullscreenButton.setIcon(`${baseUrl}/request-fullscreen.svg`);
            fullscreenButton.setTooltip('Toggle full screen');
        }
    }
}
