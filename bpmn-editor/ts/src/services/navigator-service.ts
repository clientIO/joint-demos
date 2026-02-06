import { dia, ui, util } from '@joint/plus';
import { ZOOM_SETTINGS } from '../configs/navigator-config';
import NavigatorController from '../controllers/navigator-controller';

const baseUrl = 'assets/navigator';

const IconButton = ui.widgets.button.extend({
    render: function() {
        const size = this.options.size || 20;
        const imageEl = document.createElement('img');
        imageEl.style.width = `${size}px`;
        imageEl.style.height = `${size}px`;
        this.el.appendChild(imageEl);
        this.setIcon(this.options.icon);
        this.setTooltip(this.options.tooltip);
        return this;
    },
    setIcon: function(icon = '') {
        this.el.querySelector('img').src = icon;
    },
    setTooltip: function(tooltip = '') {
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
    markup: util.svg/* xml */`<rect @selector="body" />`,
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
    confirmUpdate: function(flags: any) {
        if (this.hasFlag(flags, UpdateFlags.Render)) this.render();
        if (this.hasFlag(flags, UpdateFlags.Update)) this.update();
        // using the original `updateTransformation()` method
        if (this.hasFlag(flags, UpdateFlags.Transform)) this.updateTransformation();
    },
    render: function() {
        const doc = util.parseDOMJSON(this.markup);
        this.body = doc.selectors.body;
        this.el.appendChild(doc.fragment);
    },
    update: function() {
        const { model, body } = this;
        // shape
        const { width, height } = model.size();
        body.setAttribute('width', width.toString());
        body.setAttribute('height', height.toString());
    }
});

export default class NavigatorService {

    toolbar?: ui.Toolbar;
    navigator?: ui.Navigator;
    paperScroller?: ui.PaperScroller;
    navigatorController?: NavigatorController;

    constructor(private readonly element: HTMLElement) { }

    create(paperScroller: ui.PaperScroller) {
        this.paperScroller = paperScroller;
        this.toolbar = new ui.Toolbar({
            autoToggle: true,
            references: {
                paperScroller
            },
            tools: [
                {
                    type: 'icon-button',
                    name: 'fit-to-screen',
                    icon: `${baseUrl}/icon-zoom-to-fit.svg`,
                    tooltip: 'Fit to screen',
                    attrs: { button: { 'data-tooltip-position': 'top' }}
                },
                {
                    type: 'icon-button',
                    name: 'fullscreen',
                    attrs: { button: { 'data-tooltip-position': 'top' }}
                    /* icon and tooltip are set in updateToolbarButtons() */
                },
                {
                    type: 'zoom-slider',
                    min: ZOOM_SETTINGS.min * 100,
                    max: ZOOM_SETTINGS.max * 100,
                    step: 10,
                    attrs: { input: { 'data-tooltip': 'Slide to zoom', 'data-tooltip-position': 'top' }}
                },
                { type: 'separator' },
                {
                    type: 'icon-button',
                    name: 'minimap',
                    icon: `${baseUrl}/icon-minimap.svg`,
                    attrs: { button: { 'data-tooltip-position': 'top' }}
                }
            ],
            widgetNamespace: {
                ...ui.widgets,
                iconButton: IconButton
            } as any
        });

        this.navigatorController = new NavigatorController({
            navigatorService: this
        });

        this.toolbar.render();
        this.updateToolbarButtons();
        this.element.appendChild(this.toolbar.el);

        this.navigator = new ui.Navigator({
            paperScroller: this.paperScroller,
            width: 318,
            height: 130,
            padding: 10,
            zoom: false,
            useContentBBox: true,
            dynamicZoom: true,
            paperOptions: {
                async: true,
                autoFreeze: true,
                sorting: dia.Paper.sorting.APPROX,
                elementView: NavigatorElementView,
                cellViewNamespace: {},
                viewManagement: true,
                // Don't render links in the navigator
                cellVisibility: (cell) => !cell.isLink(),
                background: {
                    color: 'transparent'
                }
            }
        });

        this.element.prepend(this.navigator.el);
        this.navigator.render();
        this.toolbar.getWidgetByName('minimap').el.classList.add('active');

        this.navigatorController.startListening();
    }

    isMinimapVisible() {
        return !this.navigator?.el.classList.contains('hidden');
    }

    showMinimap() {
        this.navigator?.el.classList.remove('hidden');
    }

    hideMiniMap() {
        this.navigator?.el.classList.add('hidden');
    }

    updateToolbarButtons() {
        // Minimap
        const minimapButton: any = this.toolbar?.getWidgetByName('minimap');
        if (this.isMinimapVisible()) {
            minimapButton?.setTooltip('Hide minimap');
        } else {
            minimapButton?.setTooltip('Show minimap');
        }
        // Full screen
        const fullscreenButton: any = this.toolbar?.getWidgetByName('fullscreen');
        if (document.fullscreenElement) {
            fullscreenButton?.setIcon(`${baseUrl}/icon-exit-fullscreen.svg`);
            fullscreenButton?.setTooltip('Exit full screen');
        } else {
            fullscreenButton?.setIcon(`${baseUrl}/icon-enter-fullscreen.svg`);
            fullscreenButton?.setTooltip('Toggle full screen');
        }
    }
}
