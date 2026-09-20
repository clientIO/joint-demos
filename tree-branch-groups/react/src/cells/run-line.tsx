import type { ReactNode } from 'react';

/** A piece of a command line: the program, a flag, or anything else. */
type Token = { text: string; kind: 'cmd' | 'flag' | 'plain' };

/** Splits a command line into its program, its flags and the rest, whitespace kept. No grammar: a command line is a program and its arguments. */
function tokenize(run: string): Token[] {
    let program = true;
    return run.split(/(\s+)/).map((text) => {
        if (text.trim() === '') return { text, kind: 'plain' };
        if (program) {
            program = false;
            return { text, kind: 'cmd' };
        }
        return { text, kind: text.startsWith('-') ? 'flag' : 'plain' };
    });
}

/** The command a step runs, as a line of code on a chip: the program in bold, its flags tinted. */
export function RunLine({ run }: { run: string }): ReactNode {
    return (
        <code className="run">
            {tokenize(run).map((token, index) => (token.kind === 'plain' ? token.text : <span key={index} className={token.kind}>{token.text}</span>))}
        </code>
    );
}
