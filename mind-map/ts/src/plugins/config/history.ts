import type { dia } from '@joint/plus';

export default {
    cmdBeforeAdd: (...args: unknown[]) => {
        const options = args[args.length - 1] as { addToHistory?: boolean };
        if (options.addToHistory) return true;
        return false;
    }
} as Partial<dia.CommandManager.Options>;
