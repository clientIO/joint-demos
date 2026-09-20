import { dia } from '@joint/plus';

import { NODE_ICON } from './constants';
import { pillDefaults, pillMarkup, setPillLabel } from './pill';

/** A step of the flow: a plain pill with a label, sized to it. */
export class StepModel extends dia.Element {

    preinitialize() {
        this.markup = pillMarkup;
    }

    defaults() {
        return pillDefaults('tbg.Step', { attrs: { kindIcon: { d: NODE_ICON }}}, super.defaults);
    }

    /** A step with its label and, below it, the command it runs, as code. */
    static create(label: string, run?: string): StepModel {
        const step = new StepModel();
        setPillLabel(step, label, run);
        return step;
    }

    static isStep(cell: dia.Cell): cell is StepModel {
        return cell instanceof StepModel;
    }
}
