import Controller from '../controller';
import { ZOOM_SETTINGS } from '../configs/navigator-config';
import type NavigatorService from '../services/navigator-service';

type NavigatorControllerArgs = {
    navigatorService: NavigatorService;
}

export default class NavigatorController extends Controller<NavigatorControllerArgs> {

    startListening() {
        const { navigatorService } = this.context;
        const { navigator } = navigatorService;

        this.listenTo(navigatorService.toolbar, {
            'fit-to-screen:pointerclick': fitToScreen,
            'fullscreen:pointerclick': toggleFullscreen,
            'minimap:pointerclick': toggleMinimap
        });

        document.addEventListener('fullscreenchange', () => navigatorService.updateToolbarButtons());
        navigator?.el.addEventListener('transitionend', () => onTransitionend(navigatorService));
    }

    stopListening() {
        super.stopListening();

        const { navigatorService } = this.context;
        const { navigator } = navigatorService;

        document.removeEventListener('fullscreenchange', () => navigatorService.updateToolbarButtons());
        navigator?.el.removeEventListener('transitionend', () => onTransitionend(navigatorService));
    }
}

function toggleFullscreen(context: NavigatorControllerArgs) {
    const { navigatorService } = context;

    const fullScreenEl = navigatorService.toolbar?.getWidgetByName('fullscreen').el;

    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        fullScreenEl?.classList.add('active');
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
        fullScreenEl?.classList.remove('active');
    }
}

function fitToScreen(context: NavigatorControllerArgs) {
    const { navigatorService } = context;

    navigatorService.paperScroller?.zoomToFit({
        useModelGeometry: true,
        padding: 20,
        minScale: ZOOM_SETTINGS.min,
        maxScale: ZOOM_SETTINGS.max
    });
}

function toggleMinimap(context: NavigatorControllerArgs) {
    const { navigatorService } = context;

    const minimapEl = navigatorService.toolbar?.getWidgetByName('minimap').el;

    if (navigatorService.isMinimapVisible()) {
        navigatorService.hideMiniMap();
        minimapEl?.classList.remove('active');
    } else {
        navigatorService.showMinimap();
        minimapEl?.classList.add('active');
    }
    navigatorService.updateToolbarButtons();
}

function onTransitionend(navigatorService: NavigatorService) {
    navigatorService.navigator?.updateCurrentView();
}
