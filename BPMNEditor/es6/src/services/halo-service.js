import { ui } from '@joint/plus';
import { GroupNames, groups } from '../configs/halo-config';
import { getShapeConstructorByType } from '../utils';
import { Sequence } from '../shapes/flow/flow-shapes';
import { PlaceholderAttributes, PlaceholderShapeTypes } from '../shapes/placeholder/placeholder-config';

export default class HaloService {
    
    create(cellView) {
        
        const halo = new ui.Halo({
            cellView,
            boxContent: null,
            useModelGeometry: true,
            type: 'overlay',
            groups,
            smallThreshold: 0,
            tinyThreshold: 0,
            makeLink: () => {
                
                const { attrs, router } = PlaceholderAttributes[PlaceholderShapeTypes.LINK];
                
                const link = new Sequence();
                
                link.attr(attrs);
                link.router(router);
                link.set('replace', true);
                
                return link;
            },
            makeElement: ({ data }) => {
                
                const { elementType } = data;
                const ElementConstructor = getShapeConstructorByType(elementType);
                const element = new ElementConstructor();
                
                return element;
            }
        });
        
        this.halo = halo;
        
        const element = cellView.model;
        
        // Populate halo with shape specific handles
        this.populateHalo(element);
        
        
        // Swimlanes do not utilize the default remove and unlink handles
        if (element.omitDefaultHaloHandles) {
            halo.removeHandle('remove');
            halo.removeHandle('unlink');
        }
        else {
            // Change the default remove handle icon and position
            halo.changeHandle('remove', {
                position: GroupNames.ActionTools,
                icon: 'assets/halo/icon-trash.svg'
            });
            
            // Change the default unlink handle icon and position
            halo.changeHandle('unlink', {
                position: GroupNames.ActionTools,
                icon: 'assets/halo/icon-unlink.svg'
            });
        }
        
        halo.removeHandle('fork');
        halo.removeHandle('resize');
        halo.removeHandle('rotate');
        halo.removeHandle('clone');
        halo.removeHandle('link');
        halo.removeHandle('direction');
        
        halo.render();
    }
    
    close() {
        var _a;
        (_a = this.halo) === null || _a === void 0 ? void 0 : _a.remove();
    }
    
    populateHalo(shape) {
        var _a, _b;
        
        const handles = (_b = (_a = shape.getHaloHandles) === null || _a === void 0 ? void 0 : _a.call(shape)) !== null && _b !== void 0 ? _b : [];
        
        handles.forEach((handle) => {
            var _a;
            (_a = this.halo) === null || _a === void 0 ? void 0 : _a.addHandle(handle);
        });
    }
}
