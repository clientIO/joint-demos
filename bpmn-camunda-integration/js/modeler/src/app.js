import { setTheme } from '@joint/plus';
import MainService from './services/main-service';
import ToolbarService from './services/toolbar-service';
import StencilService from './services/stencil-service';
import NavigatorService from './services/navigator-service';
import HaloService from './services/halo-service';
import InspectorService from './services/inspector-service';
import LinkToolsService from './services/link-tools-service';
import FreeTransformService from './services/free-transform-service';

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
    window.graph = mainService.graph;
};
