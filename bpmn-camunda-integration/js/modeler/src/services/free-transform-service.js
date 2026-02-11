import { shapes, ui } from '@joint/plus';

const freeTransformAttributes = {
    allowRotation: false,
    useBordersToResize: true,
    padding: 4
};

export default class FreeTransformService {
    
    create(cellView) {
        var _a, _b;
        
        const { model } = cellView;
        const isBPMNShape = shapes.bpmn2.CompositePool.isPool(model) || shapes.bpmn2.Swimlane.isSwimlane(model);
        
        if (isBPMNShape) {
            new ui.BPMNFreeTransform(Object.assign({ cellView }, freeTransformAttributes));
        }
        else {
            new ui.FreeTransform(Object.assign({ cellView, minWidth: (_a = model.getMinimalSize) === null || _a === void 0 ? void 0 : _a.call(model).width, minHeight: (_b = model.getMinimalSize) === null || _b === void 0 ? void 0 : _b.call(model).height }, freeTransformAttributes)).render();
        }
    }
    
    close(paper) {
        ui.FreeTransform.clear(paper);
    }
}
