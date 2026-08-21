import { EventShapeTypes } from '../shapes/event/event-config';
import { GatewayShapeTypes } from '../shapes/gateway/gateway-config';
import { ActivityShapeTypes } from '../shapes/activity/activity-config';
import { DataShapeTypes } from '../shapes/data/data-config';
import { GroupShapeTypes } from '../shapes/group/group-config';
import { PoolShapeTypes } from '../shapes/pool/pool-config';

export interface StencilPaletteItem {
    type: string;
    icon: string;
}

// The palette is plain React (see components/stencil/bpmn-palette.tsx):
// each item renders its icon with the "JJ BPMN Icons" font and starts a
// stencil drag with the real shape constructor resolved from `type`.
export const stencilPaletteItems: StencilPaletteItem[] = [
    { type: EventShapeTypes.START, icon: '\ue036' },
    { type: EventShapeTypes.INTERMEDIATE_THROWING, icon: '\ue013' },
    { type: EventShapeTypes.END, icon: '\ue046' },
    { type: GatewayShapeTypes.EXCLUSIVE, icon: '\ue028' },
    { type: ActivityShapeTypes.TASK, icon: '\ue077' },
    { type: DataShapeTypes.DATA_STORE, icon: '\ue084' },
    { type: DataShapeTypes.DATA_OBJECT, icon: '\ue086' },
    { type: GroupShapeTypes.GROUP, icon: '\ue085' },
    { type: PoolShapeTypes.HORIZONTAL_POOL, icon: '\ue124' },
    { type: PoolShapeTypes.VERTICAL_POOL, icon: '\ue126' },
    { type: PoolShapeTypes.HORIZONTAL_SWIMLANE, icon: '\ue123' }
];
