import { dia } from '@joint/plus';
import type { DetailLevel } from './detail';

/**
 * Update flags, one per kind of work.
 *
 * `Render` replaces the markup, and only a change of level ever asks for it.
 * `Update` writes the model into the markup that is already there - the size
 * and the `data` map to this, so editing a cell never rebuilds its DOM.
 * `Transform` only moves the group, so dragging an element touches neither.
 *
 * Keeping the three apart is the point of a flagged view: a pan fires nothing
 * at all, a drag fires `Transform`, a data edit fires `Update`, and the DOM is
 * thrown away only when the level of detail actually changes.
 */
export const Flags = {
    Render: '@render',
    Update: '@update',
    Transform: '@transform'
} as const;

/** Requested together: fresh markup is empty until `update()` fills it in. */
const RENDER_FLAGS = [Flags.Render, Flags.Update];

/**
 * An element view that draws itself differently depending on how far the paper
 * is zoomed out.
 *
 * This class is the *mechanism* and nothing else - it owns the flags, decides
 * when markup has to be replaced rather than rewritten, and remembers which
 * level the markup on screen was built for. It knows nothing about what any of
 * the three levels look like. A subclass supplies that, in six methods:
 *
 * ```ts
 * class MyView extends LevelOfDetailView {
 *     protected getLevel() { return myPolicy(this.paper.scale().sx); }
 *     protected renderHigh() { this.renderJSONMarkup(MY_CARD_MARKUP); }
 *     protected updateHigh() { ... write the model into this.selectors ... }
 *     // ... and the same pair for medium and low
 * }
 * ```
 *
 * To reuse this in another app, copy this file and `detail.ts` next to it; the
 * only thing tying the two together is the `DetailLevel` union.
 *
 * The level is **view state**: it is never written to a model, so zooming
 * changes no cell and produces no graph event. The view reads its level when it
 * renders, so a view that virtual rendering mounts later picks up the right one
 * on its own, with no bookkeeping anywhere else.
 * {@link requestDetailUpdate} nudges the views that already exist when a
 * threshold is crossed.
 */
export abstract class LevelOfDetailView extends dia.ElementView {

    /**
     * The nodes of the current markup, by `@selector`.
     *
     * Assigned by `renderJSONMarkup()`, and read by `CellView.findNode()`,
     * element tools and highlighters - but `types/dia.d.ts` does not declare
     * the field, so it is declared here. Markup with a `@group-selector` would
     * need `Element[]` in the union.
     */
    declare selectors: Record<string, Element>;

    /** The level the current markup was built for, or `null` before the first render. */
    protected level: DetailLevel | null = null;

    initFlag(): dia.CellView.FlagLabel {
        return [Flags.Render, Flags.Update, Flags.Transform];
    }

    presentationAttributes(): dia.CellView.PresentationAttributes {
        return {
            position: [Flags.Transform],
            angle: [Flags.Transform],
            // Both are written into the markup that is already there. Neither
            // is a reason to rebuild it.
            size: [Flags.Update],
            data: [Flags.Update]
        };
    }

    /**
     * Called within an animation frame with the accumulated flags.
     *
     * Returns 0: this view handles every flag it declares, so nothing is left
     * over for the paper to schedule again.
     */
    confirmUpdate(flags: number): number {
        // `Render` is a request, not an order: the markup only has to be thrown
        // away when the level it was built for is no longer the level we are
        // drawing at. The guard lives here rather than inside `render()`, which
        // should always do what its name says - `confirmUpdate()` is where a
        // flagged view decides how much work a flag is actually worth.
        //
        // It also means the view cannot be broken by a careless caller:
        // `requestDetailUpdate()` is safe to call unconditionally, and wiring it
        // straight to `paper.on('scale')` would still rebuild nothing.
        if (this.hasFlag(flags, Flags.Render) && this.getLevel() !== this.level) this.render();
        if (this.hasFlag(flags, Flags.Update)) this.update();
        if (this.hasFlag(flags, Flags.Transform)) this.updateTransformation();
        return 0;
    }

    /**
     * Replaces the markup with the one for the level the view is now at.
     *
     * Unconditional, as a `render()` should be. Whether it is worth calling is
     * `confirmUpdate()`'s decision.
     */
    render(): this {
        const level = this.level = this.getLevel();
        // The subclass appends (`renderJSONMarkup()` does), so the previous
        // level's markup has to go first. This view owns its DOM - it never
        // calls the default `renderMarkup()` - so there is nothing to keep.
        this.vel.empty();
        switch (level) {
            case 'high': this.renderHigh(); break;
            case 'medium': this.renderMedium(); break;
            default: this.renderLow(); break;
        }
        return this;
    }

    /**
     * Writes the model into the markup that is already there.
     *
     * It dispatches on `this.level` - the level the markup was *built* for -
     * not on whatever {@link getLevel} says at this instant. The two agree
     * except between a threshold being crossed and `render()` running, and
     * asking again there would write high-detail values into low-detail markup.
     */
    update(): void {
        switch (this.level) {
            case 'high': this.updateHigh(); break;
            case 'medium': this.updateMedium(); break;
            case 'low': this.updateLow(); break;
            // No markup yet: `render()` has not run.
            default: break;
        }
    }

    /**
     * The level this view should be drawing at.
     *
     * Usually a threshold applied to `this.paper.scale().sx`, but it is the
     * subclass's decision - it could equally take the cell's own state into
     * account, or a mode the app is in.
     */
    protected abstract getLevel(): DetailLevel;

    /** Build the markup for the highest level of detail. */
    protected abstract renderHigh(): void;
    /** Build the markup for the middle level of detail. */
    protected abstract renderMedium(): void;
    /** Build the markup for the lowest level of detail. */
    protected abstract renderLow(): void;

    /** Write the model into the high-detail markup. */
    protected abstract updateHigh(): void;
    /** Write the model into the medium-detail markup. */
    protected abstract updateMedium(): void;
    /** Write the model into the low-detail markup. */
    protected abstract updateLow(): void;
}

/**
 * Asks every element view that currently exists to reconsider its level.
 *
 * `paper.getCellView()` returns a view only if one has already been
 * instantiated: unlike `findViewByModel()` it does not resolve a placeholder
 * and schedules nothing. That is the whole reason it is used here - going
 * through `findViewByModel()` would instantiate every view on the first
 * threshold crossing and virtual rendering would be over before the paper's
 * update loop got a say.
 *
 * The elements the paper has not mounted need no telling: when one is mounted
 * the paper ORs in its init flag and the view renders from scratch, landing on
 * the right level by itself. So this is a map lookup per element, and a
 * scheduled update only for the handful on screen.
 *
 * `isolate` keeps the update to the element itself. Without it the paper's
 * `onViewUpdate` would also update every link connected to it (it skips that
 * only for `mounting` and `isolate`) - and on a threshold crossing with a
 * screenful of elements that is every link on screen, updated for a change that
 * moves no geometry at all. It is only correct if link ends are anchored to the
 * *model* geometry, so that a change of level cannot move one; see
 * `LINK_GEOMETRY` in `app.ts`.
 *
 * Safe to call unconditionally - each view re-renders only if its own level
 * moved. A caller may still guard on the level having changed, but for a
 * different reason: to keep this loop off every frame of a zoom.
 */
export function requestDetailUpdate(paper: dia.Paper, graph: dia.Graph): void {
    for (const element of graph.getElements()) {
        const view = paper.getCellView<dia.ElementView>(element);
        if (view) view.requestUpdate(view.getFlag(RENDER_FLAGS), { isolate: true });
    }
}
