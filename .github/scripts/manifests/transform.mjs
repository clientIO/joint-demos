// Pure transform seam for Demo Manifests (joint-mcp#27): demo/variant
// inputs in, Manifest markdown + index entry out. No filesystem access —
// the golden-fixture test drives this via generateManifests().

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

// Binary assets and lockfiles are excluded from the manifest's Source files
// section only — the Demo Snapshot upload and get_demo_code are unaffected.
const BINARY_EXT_RE = /\.(?:png|jpe?g|gif|ico|woff2?|ttf|eot|mp3|mp4)$/i;
const LOCKFILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

function isSourceFile(path) {
    const base = path.split('/').pop();
    return !BINARY_EXT_RE.test(base) && !LOCKFILES.has(base);
}

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

export function buildManifest({ demoName, variantDir, version, readme, packageJson, files, sources, keywords }) {
    const { title, summary } = parseReadme(readme);
    const variant = canonicalVariant(variantDir);
    const packages = jointPackages(packageJson);
    const demoEdition = edition(packages, title);
    const demoId = `version-${version}/${demoName}/${variantDir}`;
    const uses = extractUses(sources);
    const frontmatter = [
        '---',
        `demo_id: ${yaml(demoId)}`,
        `demo: ${yaml(demoName)}`,
        `variant: ${yaml(variant)}`,
        `variant_dir: ${yaml(variantDir)}`,
        `version: ${yaml(version)}`,
        `edition: ${yaml(demoEdition)}`,
        `title: ${yaml(title)}`,
        ...(packages.length === 0
            ? ['packages: []']
            : ['packages:', ...packages.map((name) => `  - ${yaml(name)}`)]),
        '---',
    ];
    const body = [
        `# ${title}`,
        '',
        summary,
        '',
        `**Variant:** ${variant} · **Edition:** ${demoEdition} · **Packages:** ${packages.join(', ') || 'none'}`,
        '',
        ...(keywords?.length ? [`**Keywords:** ${keywords.join(', ')}`, ''] : []),
        `**Uses:** ${uses.join(', ') || 'none'}`,
        '',
        '## Source files',
        '',
        ...files.filter(isSourceFile).map((file) => `- ${file}`),
    ];
    return {
        path: `version-${version}/${demoName}/${variantDir}.md`,
        content: [...frontmatter, '', ...body].join('\n') + '\n',
        indexEntry: { demo_id: demoId, title, variant, edition: demoEdition, packages },
    };
}

export function renderIndex(version, entries) {
    return JSON.stringify({ version, demos: entries }, null, 2) + '\n';
}
