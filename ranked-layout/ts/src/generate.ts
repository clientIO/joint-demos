export interface GenerateOptions {
    seed: number;
    rankCount: number;
    // Ranks left without elements, chosen at random; never the first or the last rank.
    emptyRankCount?: number;
    elementCount: number;
    linkCount: number;
    // Links that go to an earlier rank.
    backwardLinkCount?: number;
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

// The ranks that get elements: all but `emptyRankCount` random ranks between the first and the last.
function getFilledRanks(rankCount: number, emptyRankCount: number, randomInt: (max: number) => number): number[] {
    const innerRanks = Array.from({ length: Math.max(rankCount - 2, 0) }, (_, index) => index + 1);
    const emptyRanks = new Set<number>();
    while (emptyRanks.size < Math.min(emptyRankCount, innerRanks.length)) {
        emptyRanks.add(innerRanks[randomInt(innerRanks.length)]);
    }
    return Array.from({ length: rankCount }, (_, rank) => rank).filter((rank) => !emptyRanks.has(rank));
}

export function generate(options: GenerateOptions): { elements: ElementData[], links: LinkData[] } {
    const { seed, rankCount, emptyRankCount = 0, backwardLinkCount = 0 } = options;
    const random = createRandom(seed);
    const randomInt = (max: number) => Math.floor(random() * max);
    const filledRanks = getFilledRanks(rankCount, emptyRankCount, randomInt);

    // Every filled rank gets at least one element, the rest go to random filled ranks.
    const elementCount = Math.max(options.elementCount, filledRanks.length);
    const elementsByRank: ElementData[][] = Array.from({ length: rankCount }, () => []);
    const elements: ElementData[] = [];
    for (let i = 0; i < elementCount; i++) {
        const rank = filledRanks[i < filledRanks.length ? i : randomInt(filledRanks.length)];
        const element = { id: `e${i}`, rank };
        elementsByRank[rank].push(element);
        elements.push(element);
    }

    // Links always go to a later filled rank: mostly the next one, sometimes further.
    const lastRank = filledRanks[filledRanks.length - 1];
    const sources = elements.filter((element) => element.rank < lastRank);
    const links: LinkData[] = [];
    const keys = new Set<string>();
    const maxAttempts = options.linkCount * 20;
    for (let attempt = 0; attempt < maxAttempts && links.length < options.linkCount; attempt++) {
        if (sources.length === 0) {
            break;
        }
        const source = sources[randomInt(sources.length)];
        const nextIndex = filledRanks.indexOf(source.rank) + 1;
        const targetRank = filledRanks[(random() < NEXT_RANK_CHANCE)
            ? nextIndex
            : nextIndex + randomInt(filledRanks.length - nextIndex)];
        const candidates = elementsByRank[targetRank];
        const target = candidates[randomInt(candidates.length)];
        const key = `${source.id}-${target.id}`;
        if (keys.has(key)) {
            continue;
        }
        keys.add(key);
        links.push({ source: source.id, target: target.id });
    }

    // Backward links go to a random earlier filled rank, never back along an existing link.
    // They come last, so that the forward links of a seed stay the same.
    const backwardSources = elements.filter((element) => element.rank > filledRanks[0]);
    const maxBackwardAttempts = backwardLinkCount * 20;
    let backwardCount = 0;
    for (let attempt = 0; attempt < maxBackwardAttempts && backwardCount < backwardLinkCount; attempt++) {
        if (backwardSources.length === 0) {
            break;
        }
        const source = backwardSources[randomInt(backwardSources.length)];
        const targetRank = filledRanks[randomInt(filledRanks.indexOf(source.rank))];
        const candidates = elementsByRank[targetRank];
        const target = candidates[randomInt(candidates.length)];
        const key = `${source.id}-${target.id}`;
        if (keys.has(key) || keys.has(`${target.id}-${source.id}`)) {
            continue;
        }
        keys.add(key);
        links.push({ source: source.id, target: target.id });
        backwardCount++;
    }

    return { elements, links };
}
