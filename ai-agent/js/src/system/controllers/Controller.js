import { mvc } from '@joint/plus';

/**
 * Controller interface for all controllers in the application.
 */
export default class Controller extends mvc.Listener {
    
    get context() {
        return this.callbackArguments[0];
    }
}
