import { mvc } from '@joint/plus';
import type { SystemDiagramContext } from '../diagram/types';

/**
 * Controller interface for all controllers in the application.
 */
export default abstract class Controller<A extends [SystemDiagramContext, ...args: unknown[]]> extends mvc.Listener<A> {

    get context(): A[0] {
        return this.callbackArguments[0];
    }

    abstract startListening(): void;
}
