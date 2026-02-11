import { mvc } from '@joint/plus';

export class Controller extends mvc.Listener {

    get context() {
        const [ctx = null] = this.callbackArguments;
        return ctx;
    }

}
