export interface GenerateOptions {
    seed: number;
    rankCount: number;
    elementCount: number;
    linkCount: number;
}

export interface ElementData {
    id: string;
    rank: number;
}

export interface LinkData {
    source: string;
    target: string;
}

// The chance that a link goes to the next rank rather than jumping over ranks.
const NEXT_RANK_CHANCE = 0.75;

// Mulberry32: a small seeded generator of numbers in [0, 1).
function createRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function generate(options: GenerateOptions): { elements: ElementData[], links: LinkData[] } {
    const { seed, rankCount } = options;
    const random = createRandom(seed);
    const randomInt = (max: number) => Math.floor(random() * max);

    // Every rank gets at least one element, the rest go to random ranks.
    const elementCount = Math.max(options.elementCount, rankCount);
    const elementsByRank: ElementData[][] = Array.from({ length: rankCount }, () => []);
    const elements: ElementData[] = [];
    for (let i = 0; i < elementCount; i++) {
        const rank = i < rankCount ? i : randomInt(rankCount);
        const element = { id: `e${i}`, rank };
        elementsByRank[rank].push(element);
        elements.push(element);
    }

    // Links always go to a later rank: mostly the next one, sometimes further.
    const sources = elements.filter((element) => element.rank < rankCount - 1);
    const links: LinkData[] = [];
    const keys = new Set<string>();
    const maxAttempts = options.linkCount * 20;
    for (let attempt = 0; attempt < maxAttempts && links.length < options.linkCount; attempt++) {
        if (sources.length === 0) {
            break;
        }
        const source = sources[randomInt(sources.length)];
        const nextRank = source.rank + 1;
        const targetRank = (random() < NEXT_RANK_CHANCE)
            ? nextRank
            : nextRank + randomInt(rankCount - nextRank);
        const candidates = elementsByRank[targetRank];
        const target = candidates[randomInt(candidates.length)];
        const key = `${source.id}-${target.id}`;
        if (keys.has(key)) {
            continue;
        }
        keys.add(key);
        links.push({ source: source.id, target: target.id });
    }

    return { elements, links };
}
