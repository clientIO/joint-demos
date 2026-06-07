import { dia, util } from '@joint/core';

import type { g } from '@joint/core';

// Base view for elements whose ports are aligned with their rendered HTML
// content. The port coordinates are measured from the DOM, so they stay in
// sync with the HTML layout (rows, wrapping, CSS changes) — the ports only
// need a single group with an absolute position layout.
export abstract class HtmlPortsElementView extends dia.ElementView {

    override presentationAttributes(): dia.CellView.PresentationAttributes {
        return dia.ElementView.addPresentationAttributes({
            size: ['PORT_POSITIONS']
        });
    }

    // Note: 'PORT_POSITIONS' is intentionally not part of the init flags.
    // The initial measurement happens in `onMount()` — the HTML has no
    // dimensions before the view is attached to the DOM.
    override confirmUpdate(flags: number, opt: Record<string, unknown>): number {
        let remaining = super.confirmUpdate(flags, opt);
        if (this.hasFlag(remaining, 'PORT_POSITIONS')) {
            this.updatePortPositions();
            remaining = this.removeFlag(remaining, 'PORT_POSITIONS');
        }
        return remaining;
    }

    protected override onMount(isInitialMount: boolean): void {
        super.onMount(isInitialMount);
        // The HTML can only be measured once the view is attached to the DOM.
        // Defer to the next frame so the resulting port update is processed
        // outside of the current paper update batch.
        util.nextFrame(() => {
            if (this.paper) this.updatePortPositions();
        });
    }

    // The bounding box of an HTML node in the element's local coordinate
    // system (zoom-safe).
    protected localRect(node: Element): g.Rect {
        const rect = this.paper!.clientToLocalRect(node.getBoundingClientRect());
        const position = this.model.position();
        return rect.translate(-position.x, -position.y);
    }

    // Update the coordinates of multiple ports in a single 'ports' change,
    // so the ports are only re-rendered once.
    protected setPortArgs(args: Record<string, dia.Point>): void {
        const { model } = this;
        const items: dia.Element.Port[] = (model.get('ports')?.items ?? []).map(
            (item: dia.Element.Port) => {
                const itemArgs = (item.id === undefined) ? null : args[item.id];
                return itemArgs ? { ...item, args: itemArgs } : item;
            }
        );
        model.prop('ports/items', items, { rewrite: true });
    }

    protected abstract updatePortPositions(): void;
}
