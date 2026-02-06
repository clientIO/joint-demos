
export default {
    cmdBeforeAdd: (...args) => {
        const options = args[args.length - 1];
        if (options.addToHistory)
            return true;
        return false;
    }
};
