import Controller from '../controller';
import { ZOOM_SETTINGS } from '../configs/navigator-config';

export default class NavigatorController extends Controller {
    
    startListening() {
        const { navigatorService } = this.context;
        const { navigator } = navigatorService;
        
        this.listenTo(navigatorService.toolbar, {
            'fit-to-screen:pointerclick': fitToScreen,
            'fullscreen:pointerclick': toggleFullscreen,
            'minimap:pointerclick': toggleMinimap
        });
        
        document.addEventListener('fullscreenchange', () => navigatorService.updateToolbarButtons());
        navigator === null || navigator === void 0 ? void 0 : navigator.el.addEventListener('transitionend', () => onTransitionend(navigatorService));
    }
    
    stopListening() {
        super.stopListening();
        
        const { navigatorService } = this.context;
        const { navigator } = navigatorService;
        
        document.removeEventListener('fullscreenchange', () => navigatorService.updateToolbarButtons());
        navigator === null || navigator === void 0 ? void 0 : navigator.el.removeEventListener('transitionend', () => onTransitionend(navigatorService));
    }
}

function toggleFullscreen(context) {
    var _a;
    const { navigatorService } = context;
    
    const fullScreenEl = (_a = navigatorService.toolbar) === null || _a === void 0 ? void 0 : _a.getWidgetByName('fullscreen').el;
    
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        fullScreenEl === null || fullScreenEl === void 0 ? void 0 : fullScreenEl.classList.add('active');
    }
    else if (document.exitFullscreen) {
        document.exitFullscreen();
        fullScreenEl === null || fullScreenEl === void 0 ? void 0 : fullScreenEl.classList.remove('active');
    }
}

function fitToScreen(context) {
    var _a;
    const { navigatorService } = context;
    
    (_a = navigatorService.paperScroller) === null || _a === void 0 ? void 0 : _a.zoomToFit({
        useModelGeometry: true,
        padding: 20,
        minScale: ZOOM_SETTINGS.min,
        maxScale: ZOOM_SETTINGS.max
    });
}

function toggleMinimap(context) {
    var _a;
    const { navigatorService } = context;
    
    const minimapEl = (_a = navigatorService.toolbar) === null || _a === void 0 ? void 0 : _a.getWidgetByName('minimap').el;
    
    if (navigatorService.isMinimapVisible()) {
        navigatorService.hideMiniMap();
        minimapEl === null || minimapEl === void 0 ? void 0 : minimapEl.classList.remove('active');
    }
    else {
        navigatorService.showMinimap();
        minimapEl === null || minimapEl === void 0 ? void 0 : minimapEl.classList.add('active');
    }
    navigatorService.updateToolbarButtons();
}

function onTransitionend(navigatorService) {
    var _a;
    (_a = navigatorService.navigator) === null || _a === void 0 ? void 0 : _a.updateCurrentView();
}
