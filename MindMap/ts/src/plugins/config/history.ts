import type { dia } from '@joint/plus';

export default {
    cmdBeforeAdd: (...args: any[]) => {
        const options = args[args.length - 1];
        if (options.addToHistory) return true;
        return false;
    }
} as Partial<dia.CommandManager.Options>;
