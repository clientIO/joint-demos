import type { dia } from '@joint/plus';
import Controller from './Controller';
import type { App } from '../app';
import { Animations, getAnimationLevel } from '../runtime/animations';

/**
 * Animates the plant (see `animations.ts`) and keeps the animations in sync with its state:
 * a pump switched off stops spinning and the liquid stops flowing through its pipes,
 * a value shown by a part of a shape (a level, a charge, a column) glides to its new value (by its view, see `glide.ts`).
 * What moves is the level of the diagram (see `AnimationLevel`).
 * Active in the runtime mode only.
 */
export default class AnimationsController extends Controller<[App, Animations]> {

    constructor(app: App) {
        // The animations of the paper: passed to the handlers too
        super(app, new Animations(app.paper));
    }

    get animations(): Animations {
        return this.callbackArguments[1];
    }

    startListening(): void {
        const { graph, paper } = this.app;

        // The level of the diagram; the alarms only if the user asks the system for less motion
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.animations.level = reducedMotion ? 'alarms' : getAnimationLevel(graph);
        // What moves are the nodes of the views, which the paper renders asynchronously: on a phone the example picked
        // runs the moment it is opened (see `phone.ts`), with nothing of it on the paper yet - the plant starts moving
        // when it is there. From the Run button of the toolbar the diagram is rendered already.
        if (paper.hasScheduledUpdates()) {
            this.listenTo(paper, { 'render:done': onRendered });
        } else {
            this.animations.start();
        }

        this.listenTo(graph, {
            // Switched on or off, opened or closed (a value glides by its view, see `glide.ts`)
            'change:data': onDataChange
        });
    }

    stopListening(): void {
        super.stopListening();
        this.animations.stop();
    }
}

/** The diagram is on the paper: the plant starts moving (the first render only, see `Animations.start()`) */
function onRendered(_app: App, animations: Animations) {
    animations.start();
}

/** The cell switched on or off, opened or closed: its animations, and of the pipes of an element */
function onDataChange(_app: App, animations: Animations, cell: dia.Cell) {
    if (!animations.stateChanged(cell)) {
        return;
    }
    animations.animate(cell);
    if (cell.isElement()) {
        animations.animatePipes(cell);
    }
}
