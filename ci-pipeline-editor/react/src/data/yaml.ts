import { getDefaultOptionName, getEdges } from './diagram-data';
import type { DiagramJSON, Edge, Id, NodeData } from './types';

/**
 * The diagram as YAML: the flow from the start as a sequence of steps, a
 * fork as a map of its branches, a decision with a map of its options, a
 * loop with its body - each a sequence again - and `end` where a path ends.
 * The comment of a node goes above it, as a YAML comment.
 *
 *     steps:
 *       # Shallow: the history is not needed.
 *       - name: Checkout
 *         run: git fetch --depth 1
 *       - fork:
 *           Quality:
 *             - name: Lint
 *       - name: Deploy
 *         run: |
 *           npm run build
 *           npm run deploy
 *       - decision: Deploy target
 *         options:
 *           Staging:
 *             - loop:
 *                 - name: Run smoke tests
 *             - end
 *
 * Written by hand: the structure is small and fixed, and a library would
 * be the only dependency of the demo.
 */
export function toYAML(json: DiagramJSON): string {
    const root = Object.entries(json).find(([, node]) => node.type === 'start');
    const first = root ? getEdges(root[1], 'to')[0] : undefined;
    const lines = first ? ['steps:', ...sequence(json, first.id, 1)] : ['steps: []'];
    return lines.join('\n') + '\n';
}

const INDENT = '  ';

/**
 * The lines of `key: value`, indented by `pad`: a value of several lines as
 * a literal block, `key: |` and the lines one level deeper - the way every
 * CI file writes a script (a reader adds a final newline, which a shell
 * does not mind); a value of one line as a scalar after the key.
 */
function keyed(key: string, value: string, pad: string): string[] {
    if (!value.includes('\n')) return [`${pad}${key}: ${scalar(value)}`];
    return [`${pad}${key}: |`, ...value.split('\n').map((line) => (line === '' ? '' : `${pad}${INDENT}${line}`))];
}

/** A scalar, quoted where YAML would read it as something else - or as several lines, or with a control character. */
function scalar(value: string): string {
    // eslint-disable-next-line no-control-regex
    const plain = /^[A-Za-z_][^:#{}[\],&*!|>'"%@`?\x00-\x1F\x7F]*$/.test(value) && !/\s$/.test(value) && !/^(true|false|null|yes|no|on|off)$/i.test(value);
    return plain ? value : JSON.stringify(value);
}

/**
 * The keys of the options or the branches `edges` lead to: their names, or
 * their defaults (`option 1`, `branch 1`, ... by the `type` of the parent).
 * A map takes each key once: a name that repeats an earlier one - two
 * branches named alike, an option named `option 2` next to an unnamed
 * second one - is numbered, `Build (2)`.
 */
function keys(edges: Edge[], type: NodeData['type']): string[] {
    const used = new Set<string>();
    return edges.map((edge, index) => {
        const name = edge.name || getDefaultOptionName(type, index);
        let unique = name;
        for (let n = 2; used.has(unique); n += 1) unique = `${name} (${n})`;
        used.add(unique);
        return scalar(unique);
    });
}

/**
 * The lines of the sequence that starts at `id`: the chain of what follows
 * one another, until a decision (whose options are sequences of their own)
 * or an end. Indented by `depth` levels.
 */
function sequence(json: DiagramJSON, id: Id | undefined, depth: number): string[] {
    const lines: string[] = [];
    let current: Id | undefined = id;
    while (current !== undefined) {
        const node: NodeData = json[current];
        const comment = 'comment' in node ? node.comment : undefined;
        if (comment) lines.push(...comment.split(/\r\n?|\n/).map((line) => `${INDENT.repeat(depth)}# ${line}`));
        const [first, ...rest] = item(json, node, depth + 1);
        lines.push(`${INDENT.repeat(depth)}- ${first}`, ...rest);
        if (node.type === 'decision' || node.type === 'end') break;
        current = getEdges(node, 'to')[0]?.id;
    }
    return lines;
}

/** The lines of a map of sequences - the branches of a group, the options of a decision - indented by `depth` levels. */
function branches(json: DiagramJSON, edges: Edge[], depth: number, type: NodeData['type']): string[] {
    const names = keys(edges, type);
    return edges.flatMap((edge, index) => [`${INDENT.repeat(depth)}${names[index]}:`, ...sequence(json, edge.id, depth + 1)]);
}

/** The lines of one item of a sequence: the first goes after the dash; the rest are indented by `depth` levels. */
function item(json: DiagramJSON, node: NodeData, depth: number): string[] {
    const pad = INDENT.repeat(depth);
    switch (node.type) {
        case 'step':
            return [`name: ${scalar(node.label)}`, ...(node.run ? keyed('run', node.run, pad) : [])];
        case 'decision': {
            const options = getEdges(node, 'to');
            return [`decision: ${scalar(node.label)}`, ...(options.length > 0 ? [`${pad}options:`, ...branches(json, options, depth + 1, node.type)] : [`${pad}options: {}`])];
        }
        case 'fork': {
            const edges = getEdges(node, 'branches');
            return edges.length > 0 ? ['fork:', ...branches(json, edges, depth + 1, node.type)] : ['fork: {}'];
        }
        case 'loop': {
            const edges = getEdges(node, 'branches');
            if (edges.length === 0) return ['loop: []'];
            // A loop with one body is the common case: its body straight away; several bodies, a map like a fork.
            return edges.length === 1 ? ['loop:', ...sequence(json, edges[0].id, depth + 1)] : ['loop:', ...branches(json, edges, depth + 1, node.type)];
        }
        case 'end':
            return ['end'];
        case 'start':
            // Never an item: the start opens the document. Here for the compiler.
            return ['start'];
    }
}
