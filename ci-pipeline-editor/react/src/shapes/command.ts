/** A piece of a command: the program, a flag, or anything else - whitespace included, so that the pieces make the command up again. */
export interface CommandToken {
    text: string;
    kind: 'cmd' | 'flag' | 'plain';
}

/** Words that stand before the program and belong to it: `sudo apt-get` is one program. */
const PREFIXES = new Set(['sudo', 'env', 'time', 'nohup', 'exec']);
/** Where one command ends and the next begins on a line. */
const SEPARATORS = new Set(['&&', '||', '|', ';']);

/**
 * Splits a command - one line or several - into its programs, its flags
 * and the rest. No grammar: a command is a program and its arguments; a
 * new one starts at the beginning of a line and after a separator, unless
 * the line before ended in a `\`, which continues its command - its words
 * are arguments then. The `\` itself is tinted like a flag: syntax.
 */
export function tokenizeCommand(run: string): CommandToken[] {
    const tokens: CommandToken[] = [];
    // Whether the next word is a program; whether the last word was a `\`.
    let commandStart = true;
    let continued = false;
    for (const text of run.split(/(\s+)/)) {
        if (text === '') continue;
        if (/^\s+$/.test(text)) {
            if (text.includes('\n') && !continued) commandStart = true;
            tokens.push({ text, kind: 'plain' });
            continue;
        }
        continued = text === '\\';
        if (continued) {
            tokens.push({ text, kind: 'flag' });
        } else if (SEPARATORS.has(text)) {
            commandStart = true;
            tokens.push({ text, kind: 'plain' });
        } else if (commandStart) {
            commandStart = PREFIXES.has(text);
            tokens.push({ text, kind: 'cmd' });
        } else {
            tokens.push({ text, kind: text.startsWith('-') ? 'flag' : 'plain' });
        }
    }
    return tokens;
}
