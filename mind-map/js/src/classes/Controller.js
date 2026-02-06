import { mvc } from '@joint/plus';

export class Controller extends mvc.Listener {
    context;
    
    constructor(context) {
        super(context);
        this.context = context;
        this.startListening();
    }
}
