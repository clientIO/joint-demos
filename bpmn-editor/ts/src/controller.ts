import { mvc } from '@joint/plus';

export default class Controller<T> extends mvc.Listener<[T]> {

    get context() {
        const [ctx] = this.callbackArguments;
        return ctx;
    }
}
