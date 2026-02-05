import type { dia } from '@joint/plus';
import { shapes, ui } from '@joint/plus';
import type { AppElement } from '../shapes/shapes-typing';

const freeTransformAttributes = {
    allowRotation: false,
    useBordersToResize: true,
    padding: 4
};

export default class FreeTransformService {

    create(cellView: dia.ElementView<AppElement>) {

        const { model } = cellView;
        const isBPMNShape = shapes.bpmn2.CompositePool.isPool(model) || shapes.bpmn2.Swimlane.isSwimlane(model);

        if (isBPMNShape) {
            new ui.BPMNFreeTransform({
                cellView,
                ...freeTransformAttributes
            });
        } else {
            new ui.FreeTransform({
                cellView,
                minWidth: model.getMinimalSize?.().width,
                minHeight: model.getMinimalSize?.().height,
                ...freeTransformAttributes
            }).render();
        }
    }

    close(paper: dia.Paper) {
        ui.FreeTransform.clear(paper);
    }
}
