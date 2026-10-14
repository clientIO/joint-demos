import type { App, SidePanel } from '../app';
import { ColorScheme, Mode } from '../const';
import { fitOptions, runtimeFitOptions } from '../canvas/config';
import { getScreen, isScreenShown } from '../canvas/screen';

/*
 * What the canvas shows, the side panels, the color scheme of the app (remembered).
 */

/** Show the whole diagram: on loading, entering the runtime mode (a wider canvas) and with the toolbar button. */
export function zoomToFit(app: App): void {
    // The runtime mode with a screen: the screen fills the canvas (see `screen.ts`).
    const screen = isScreenShown(app) ? getScreen(app.graph) : undefined;
    if (screen) {
        app.scroller.zoomToRect(screen.getBBox(), { padding: 0, minScale: 0.01, maxScale: 100 });
        return;
    }
    app.scroller.zoomToFit(app.mode === Mode.Runtime ? runtimeFitOptions : fitOptions);
}

/**
 * The page full screen, or back: its own document (in an iframe too, if allowed - `allow="fullscreen"`; the toolbar
 * shows the button only then, see `document.fullscreenEnabled`)
 */
export function toggleFullScreen(): void {
    // Refused (no user gesture, not allowed): the page stays as it is
    const ignore = () => undefined;
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(ignore);
    } else {
        document.documentElement.requestFullscreen().catch(ignore);
    }
}

// Where the color scheme chosen is remembered (in this browser)
const COLOR_SCHEME_KEY = 'scada-editor:color-scheme';

/** The color scheme chosen last time, or the one of the system. */
export function storedColorScheme(): ColorScheme {
    try {
        const stored = localStorage.getItem(COLOR_SCHEME_KEY);
        if (stored === ColorScheme.Light || stored === ColorScheme.Dark) {
            return stored;
        }
    } catch {
        // No storage (a private window): the system decides.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? ColorScheme.Dark : ColorScheme.Light;
}

export function storeColorScheme(colorScheme: ColorScheme): void {
    try {
        localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
    } catch {
        // Not remembered, but switched.
    }
}

/**
 * Show the side panel if it is hidden, hide it otherwise (see `App.setPanelShown()`): the diagram stays where it is on
 * the screen - the canvas grows or shrinks on the side of the panel
 */
export function togglePanel(app: App, panel: SidePanel): void {
    const { scroller } = app;
    const area = scroller.getVisibleArea();
    app.setPanelShown(panel, !app.isPanelShown(panel));
    // The palette is on the left: the right edge of the canvas stays (the inspector on the right: the left one, as it is)
    if (panel === 'palette') {
        scroller.positionPoint(area.topRight(), '100%', 0);
    }
}

/** Hide both side panels if any is shown, show both otherwise (as Figma's Cmd + \) */
export function toggleSidePanels(app: App): void {
    const shown = app.isPanelShown('palette') || app.isPanelShown('inspector');
    (['palette', 'inspector'] as const).forEach((panel) => {
        if (app.isPanelShown(panel) === shown) {
            togglePanel(app, panel);
        }
    });
}
