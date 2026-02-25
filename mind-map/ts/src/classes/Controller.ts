import { mvc } from '@joint/plus';

export namespace Controller {

    export type Callback<
        TContext,
        TFunction extends (...args: unknown[]) => unknown
        > = (
            ...args: [TContext, ...Parameters<TFunction>]
        ) => ReturnType<TFunction>;

    export interface EventMap<T> {
        [eventName: string]: Callback<T, (...args: unknown[]) => void>;
    }

}

export abstract class Controller<T> extends mvc.Listener<[T]> {

    constructor(public readonly context: T) {
        super(context);
        this.startListening();
    }

    abstract startListening(): void;
}
