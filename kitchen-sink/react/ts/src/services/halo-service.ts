import { ui } from '@joint/plus';
const Position = ui.Halo.HandlePosition;

export class HaloService {

    create(cellView: joint.dia.CellView) {
        const halo = new ui.Halo({
            cellView,
            boxContent: null,
            handles: this.getHaloConfig(),
            useModelGeometry: true,
        });
        halo.render();
    }

    getHaloConfig() {

        return [
            {
                ...ui.Halo.getDefaultHandle('remove'),
                position: Position.NW,
                attrs: {
                    '.handle': {
                        'data-tooltip-class-name': 'small',
                        'data-tooltip': 'Click to remove the object',
                        'data-tooltip-position': 'right',
                        'data-tooltip-padding': 15
                    }
                }
            },
            {
                ...ui.Halo.getDefaultHandle('unlink'),
                position: Position.W,
                attrs: {
                    '.handle': {
                        'data-tooltip-class-name': 'small',
                        'data-tooltip': 'Click to break all connections to other objects',
                        'data-tooltip-position': 'right',
                        'data-tooltip-padding': 15
                    }
                }
            },
            {
                ...ui.Halo.getDefaultHandle('rotate'),
                position: Position.SW,
                attrs: {
                    '.handle': {
                        'data-tooltip-class-name': 'small',
                        'data-tooltip': 'Click and drag to rotate the object',
                        'data-tooltip-position': 'right',
                        'data-tooltip-padding': 15
                    }
                }
            },
            {
                ...ui.Halo.getDefaultHandle('fork'),
                position: Position.NE,
                attrs: {
                    '.handle': {
                        'data-tooltip-class-name': 'small',
                        'data-tooltip': 'Click and drag to clone and connect the object in one go',
                        'data-tooltip-position': 'left',
                        'data-tooltip-padding': 15
                    }
                }
            },
            {
                ...ui.Halo.getDefaultHandle('link'),
                position: Position.E,
                attrs: {
                    '.handle': {
                        'data-tooltip-class-name': 'small',
                        'data-tooltip': 'Click and drag to connect the object',
                        'data-tooltip-position': 'left',
                        'data-tooltip-padding': 15
                    }
                }
            },
            {
                ...ui.Halo.getDefaultHandle('clone'),
                position: Position.SE,
                attrs: {
                    '.handle': {
                        'data-tooltip-class-name': 'small',
                        'data-tooltip': 'Click and drag to clone the object',
                        'data-tooltip-position': 'left',
                        'data-tooltip-padding': 15
                    }
                }
            }
        ];
    }
}

