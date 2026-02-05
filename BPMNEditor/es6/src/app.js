import { setTheme } from '@joint/plus';
import MainService from './services/main-service';
import ToolbarService from './services/toolbar-service';
import StencilService from './services/stencil-service';
import NavigatorService from './services/navigator-service';
import HaloService from './services/halo-service';
import InspectorService from './services/inspector-service';
import LinkToolsService from './services/link-tools-service';
import FreeTransformService from './services/free-transform-service';
import * as carWashProcess from './data/car-wash-process.json';
import { ZOOM_SETTINGS } from './configs/navigator-config';

export const init = () => {
    
    setTheme('bpmn');
    
    const secondaryServices = {
        toolbarService: new ToolbarService(document.querySelector('.app-toolbar')),
        stencilService: new StencilService(document.querySelector('.stencil-container')),
        navigatorService: new NavigatorService(document.querySelector('.navigator-container')),
        haloService: new HaloService(),
        inspectorService: new InspectorService({
            inspectorEl: document.querySelector('.inspector'),
            contentButton: document.querySelector('.inspector-content-button'),
            appearanceButton: document.querySelector('.inspector-appearance-button')
        }),
        linkToolsService: new LinkToolsService(),
        freeTransformService: new FreeTransformService()
    };
    
    const mainService = new MainService(document.querySelector('.paper-container'), secondaryServices);
    mainService.start();
    mainService.graph.fromJSON(carWashProcess);
    // Zoom to fit the initial diagram, account for the stencil overlay from the left
    mainService.paperScroller.zoomToFit({
        useModelGeometry: true,
        minScale: ZOOM_SETTINGS.min,
        maxScale: 1,
        padding: { left: 120, top: 20, right: 20, bottom: 20 }
    });
};
