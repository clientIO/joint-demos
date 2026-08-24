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
import { fitDiagramToViewport } from './utils';

export const init = () => {

    setTheme('bpmn');

    const secondaryServices = {
        toolbarService: new ToolbarService(document.querySelector('.app-toolbar') as HTMLDivElement),
        stencilService: new StencilService(document.querySelector('.stencil-container') as HTMLDivElement),
        navigatorService: new NavigatorService(document.querySelector('.navigator-container') as HTMLDivElement),
        haloService: new HaloService(),
        inspectorService: new InspectorService({
            inspectorEl: document.querySelector('.inspector') as HTMLDivElement,
            contentButton: document.querySelector('.inspector-content-button') as HTMLButtonElement,
            appearanceButton: document.querySelector('.inspector-appearance-button') as HTMLButtonElement
        }),
        linkToolsService: new LinkToolsService(),
        freeTransformService: new FreeTransformService()
    };

    const mainService = new MainService(document.querySelector('.paper-container') as HTMLDivElement, secondaryServices);
    mainService.start();
    mainService.graph.fromJSON(carWashProcess);
    fitDiagramToViewport(mainService.paperScroller);
};
