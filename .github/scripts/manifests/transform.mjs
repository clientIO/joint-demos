// Pure transform seam for Demo Manifests (joint-mcp#27, v4 layout: #44/#45):
// one demo's variants in, one Manifest markdown per emitted variant out.
// No filesystem access — the golden-fixture test drives this via
// generateManifests().

const COMMERCIAL_PACKAGES = new Set(['@joint/plus', '@joint/react-plus', '@clientio/rappid', 'rappid']);
const JOINT_PACKAGE_RE = /^(@joint\/|@clientio\/rappid$|jointjs$|rappid$)/;

// 'react-redux-ts' -> 'react', 'vue-ts' -> 'vue', 'js' -> 'js'
export function canonicalVariant(variantDir) {
    return variantDir.split('-')[0];
}

export function jointPackages(packageJson) {
    return Object.keys(packageJson.dependencies ?? {})
        .filter((name) => JOINT_PACKAGE_RE.test(name))
        .sort();
}

// Edition is keyed off package.json dependencies; the title check covers
// demos that load Joint from a CDN bundle and declare no joint dependency.
export function edition(packages, title) {
    if (packages.length > 0) {
        return packages.some((name) => COMMERCIAL_PACKAGES.has(name)) ? 'commercial' : 'open-source';
    }
    return title.includes('JointJS+') ? 'commercial' : 'open-source';
}

// [^;]+? spans multi-line named imports (which contain no ';') but cannot
// leak across a preceding statement such as a side-effect CSS import.
const JOINT_IMPORT_RE = /import\s+([^;]+?)\s+from\s+['"](?:@joint\/[^'"]+|jointjs|@clientio\/rappid|rappid)['"]/g;

const TOOLING_BINDINGS = new Set(['jsx', 'env']);

function importedBindings(source) {
    const bindings = [];
    for (const match of source.matchAll(JOINT_IMPORT_RE)) {
        const clause = match[1].trim();
        const star = clause.match(/^\*\s+as\s+(\w+)$/);
        if (star) {
            bindings.push({ local: star[1], original: null, star: true });
            continue;
        }
        const named = clause.match(/\{([^}]*)\}/);
        if (named) {
            for (const part of named[1].split(',')) {
                const name = part.trim().replace(/^type\s+/, '');
                if (!name) continue;
                const alias = name.match(/^(\w+)\s+as\s+(\w+)$/);
                if (alias) {
                    bindings.push({ local: alias[2], original: alias[1], star: false });
                } else {
                    const bare = name.split(/\s+/)[0];
                    bindings.push({ local: bare, original: bare, star: false });
                }
            }
        }
        const defaultImport = clause.match(/^(\w+)\s*(?:,|$)/);
        if (defaultImport) {
            bindings.push({ local: defaultImport[1], original: defaultImport[1], star: false });
        }
    }
    return bindings;
}

// dia.Paper.Options -> dia.Paper: keep segments while they are all-lowercase
// namespaces; the first segment containing a capital ends the chain. Chains
// with no capitalized segment (util.breakText) are kept whole.
function collapseChain(segments) {
    const kept = [];
    for (const segment of segments) {
        kept.push(segment);
        if (/[A-Z]/.test(segment)) break;
    }
    return kept.join('.');
}

// Joint API symbols the variant's code uses, from its imports of Joint
// packages. Aliased bindings are recorded under their original names; star
// imports emit members without the local namespace prefix; bindings never
// referenced outside their import declaration are dropped, as are the
// jsx/env tooling bindings. Member chains collapse after the first
// capitalized segment (dia.Paper.Options -> dia.Paper).
export function extractUses(sources) {
    const uses = new Set();
    for (const source of sources) {
        const bindings = importedBindings(source);
        if (bindings.length === 0) continue;
        const body = source.replace(JOINT_IMPORT_RE, '');
        for (const { local, original, star } of bindings) {
            if (TOOLING_BINDINGS.has(local) || TOOLING_BINDINGS.has(original ?? '')) continue;
            const memberRe = new RegExp(`\\b${local}\\.(\\w+(?:\\.\\w+)*)`, 'g');
            let hasMember = false;
            for (const member of body.matchAll(memberRe)) {
                hasMember = true;
                const chain = member[1].split('.');
                uses.add(collapseChain(star ? chain : [original, ...chain]));
            }
            if (!hasMember && !star && new RegExp(`\\b${local}\\b`).test(body)) {
                uses.add(original);
            }
        }
    }
    return [...uses].sort();
}

const ONLINE_NOTE_RE = /^This demo is also available online at /;

// Tags must start with a letter or '/', so a prose '<' (e.g. "a < b")
// never swallows text. [^>] matches newlines, so a single pass over a
// joined block also removes tags that span lines (the StackBlitz badge).
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;

function cleanInline(text) {
    return text
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(HTML_TAG_RE, '')
        .trim();
}

export function parseReadme(markdown) {
    const lines = markdown.split('\n');
    let title = '';
    let seenTitle = false;
    const summaryLines = [];
    for (const line of lines) {
        if (!seenTitle) {
            const heading = line.match(/^#\s+(.*)$/);
            if (heading) {
                title = cleanInline(heading[1]);
                seenTitle = true;
            }
            continue;
        }
        if (/^##\s/.test(line)) break;
        summaryLines.push(line);
    }
    const summary = summaryLines
        .join('\n')
        .replace(HTML_TAG_RE, '')
        .split('\n')
        .map(cleanInline)
        .filter((line) => !ONLINE_NOTE_RE.test(line))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return { title, summary };
}

function yaml(value) {
    return JSON.stringify(value);
}

// The imperative react variants (spec joint-mcp#44): they build on
// @joint/plus inside React rather than @joint/react*, so they are hidden
// from discovery — no manifest document, no Variants-line mention. Their
// Demo Snapshot sources stay in R2 and get_demo_code still serves them.
// Deliberately an explicit demo/variant-dir list, not a package predicate:
// all future react demos will use @joint/react.
export const HIDDEN_VARIANTS = new Set([
    'chatbot/react-ts',
    'chatbot/react-redux-ts',
    'diagram-index/react',
    'kitchen-sink/react-ts',
    'kitchen-sink/react-js',
    'tabs/react',
]);

// Canonical variant folders that get manifest documents, in emission (and
// Variants-line) order. Vue/svelte are deferred — see spec joint-mcp#44.
const EMITTED_VARIANTS = ['js', 'ts', 'react', 'angular'];

// One Manifest per emitted variant, keyed <variant>/<demo>.md so the
// worker's variant filter is a plain folder filter. `variants` is
// pre-grouped and sorted by the walker; each carries
// { variantDir, packageJson, sources }. Title/summary come from the
// demo-root README only; edition is keyed off the variant's own joint
// packages (title fallback covers CDN-only demos).
export function buildDemoManifests({ demoName, version, readme, keywords, variants }) {
    const { title, summary } = parseReadme(readme);
    const byCanonical = new Map();
    for (const variant of variants) {
        const canonical = canonicalVariant(variant.variantDir);
        if (!EMITTED_VARIANTS.includes(canonical)) continue;
        if (HIDDEN_VARIANTS.has(`${demoName}/${variant.variantDir}`)) continue;
        const clash = byCanonical.get(canonical);
        if (clash) {
            throw new Error(
                `${demoName}: variant directories ${clash.variantDir} and ${variant.variantDir} `
                + `both emit as '${canonical}' — hide or remove one`,
            );
        }
        byCanonical.set(canonical, variant);
    }
    const documents = [];
    for (const canonical of EMITTED_VARIANTS) {
        const variant = byCanonical.get(canonical);
        if (!variant) continue;
        const packages = jointPackages(variant.packageJson);
        const variantEdition = edition(packages, title);
        const otherVariants = EMITTED_VARIANTS.filter((name) => name !== canonical && byCanonical.has(name));
        const frontmatter = [
            '---',
            `demo: ${yaml(demoName)}`,
            `version: ${yaml(version)}`,
            `edition: ${yaml(variantEdition)}`,
            `title: ${yaml(title)}`,
            '---',
        ].join('\n');
        // Every element is separated from the next by exactly one blank
        // line; demo_id/Packages/Uses/Variants are one consecutive block.
        const sections = [
            frontmatter,
            `# ${title}`,
            summary,
            `**Edition:** ${variantEdition}`,
            ...(keywords?.length ? [`**Keywords:** ${keywords.join(', ')}`] : []),
            [
                `**demo_id:** version-${version}/${demoName}/${variant.variantDir}`,
                `**Packages:** ${packages.join(', ') || 'none'}`,
                `**Uses:** ${extractUses(variant.sources).join(', ') || 'none'}`,
                ...(otherVariants.length ? [`**Variants:** ${otherVariants.join(', ')}`] : []),
            ].join('\n'),
        ];
        documents.push({
            path: `manifests/version-${version}/${canonical}/${demoName}.md`,
            content: sections.join('\n\n') + '\n',
        });
    }
    return documents;
}
