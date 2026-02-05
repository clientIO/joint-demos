import { mvc } from '@joint/plus';

export default class Controller extends mvc.Listener {
    
    get context() {
        const [ctx] = this.callbackArguments;
        return ctx;
    }
}
