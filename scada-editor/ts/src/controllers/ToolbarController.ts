import Controller from './Controller';
import type { App } from '../app';
import { ColorScheme, Mode } from '../const';
import { exportImage, newDiagram, openDiagram, saveDiagram, toggleFullScreen, togglePanel, zoomToFit } from '../actions';
import { isSettingsOpen, toggleSettings } from '../inspector/settings';

/**
 * The toolbar buttons. Active in every mode.
 * (Zooming is handled by the built-in toolbar tools.)
 */
export default class ToolbarController extends Controller {

    startListening(): void {
        const { toolbar } = this.app;

        this.listenTo(toolbar, {
            'mode:pointerclick': onModePointerclick,
            'zoomToFit:pointerclick': onZoomToFitPointerclick,
            'fullscreen:pointerclick': onFullscreenPointerclick,
            // In the edit mode only (the buttons are not in the toolbar of the runtime mode)
            'new:pointerclick': onNewPointerclick,
            'save:pointerclick': onSavePointerclick,
            'export:pointerclick': onExportPointerclick,
            'open:pointerclick': onOpenPointerclick,
            'settings:pointerclick': onSettingsPointerclick,
            'palette:pointerclick': onPalettePointerclick,
            'inspector:pointerclick': onInspectorPointerclick,
            'colorScheme:pointerclick': onColorSchemePointerclick
        });
    }
}

function onModePointerclick(app: App) {
    const { mode } = app;
    app.setMode(mode === Mode.Edit ? Mode.Runtime : Mode.Edit);
}

function onFullscreenPointerclick() {
    toggleFullScreen();
}

function onColorSchemePointerclick(app: App) {
    const { colorScheme } = app;
    app.setColorScheme(colorScheme === ColorScheme.Light ? ColorScheme.Dark : ColorScheme.Light);
}

/** A new diagram: its settings open (the screen, the style) - the first thing to set */
function onNewPointerclick(app: App) {
    if (newDiagram(app) && !isSettingsOpen(app)) {
        toggleSettings(app);
    }
}

function onSavePointerclick(app: App) {
    saveDiagram(app);
}

function onExportPointerclick(app: App) {
    exportImage(app);
}

function onOpenPointerclick(app: App) {
    openDiagram(app);
}

function onZoomToFitPointerclick(app: App) {
    zoomToFit(app);
}

/** The settings are in the inspector panel: shown with them */
function onSettingsPointerclick(app: App) {
    app.setPanelShown('inspector', true);
    toggleSettings(app);
}

function onPalettePointerclick(app: App) {
    togglePanel(app, 'palette');
}

function onInspectorPointerclick(app: App) {
    togglePanel(app, 'inspector');
}
