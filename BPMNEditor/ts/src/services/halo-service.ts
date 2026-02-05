import type { dia } from '@joint/plus';
import { ui } from '@joint/plus';
import { GroupNames, groups } from '../configs/halo-config';
import type { AppElement } from '../shapes/shapes-typing';
import { getShapeConstructorByType } from '../utils';
import { Sequence } from '../shapes/flow/flow-shapes';
import { PlaceholderAttributes, PlaceholderShapeTypes } from '../shapes/placeholder/placeholder-config';

export default class HaloService {

    halo?: ui.Halo;

    create(cellView: dia.CellView) {

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
                const element = new ElementConstructor() as AppElement;

                return element;
            }
        });

        this.halo = halo;

        const element = cellView.model as AppElement;

        // Populate halo with shape specific handles
        this.populateHalo(element);


        // Swimlanes do not utilize the default remove and unlink handles
        if (element.omitDefaultHaloHandles) {
            halo.removeHandle('remove');
            halo.removeHandle('unlink');
        } else {
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
        this.halo?.remove();
    }

    private populateHalo(shape: AppElement) {

        const handles = shape.getHaloHandles?.() ?? [];

        handles.forEach((handle) => {
            this.halo?.addHandle(handle);
        });
    }
}
