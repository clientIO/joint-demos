import { Controller } from '../system/controllers';
// Actions
import { updateWires, updateWireGeometry } from '../actions/wire-actions';
import { updateJSONPanel } from '../actions/json-actions';

import type { App } from '../app';

/**
 * NetlistController keeps the derived views of the netlist up to date:
 * - the wire widths and the Yosys JSON every time the diagram is rebuilt,
 * - the junction points and the bus width labels every time the wires are rerouted.
 */
export default class NetlistController extends Controller<[App]> {

    startListening() {
        const { history, routerReady } = this.context;

        // The diagram is rebuilt from the data on these events (see `BuildController`)
        this.listenTo(history, {
            'stack:undo stack:redo stack:push stack:reset': onDiagramRebuild,
        });

        routerReady.then((routerService) => {
            this.listenTo(routerService, {
                'idle': onWiresRouted,
            });
        });
    }
}

function onDiagramRebuild(app: App) {
    updateWires(app);
    updateWireGeometry(app);
    updateJSONPanel(app);
}

function onWiresRouted(app: App) {
    updateWireGeometry(app);
}
