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

function importedBindings(source) {
    const bindings = [];
    for (const match of source.matchAll(JOINT_IMPORT_RE)) {
        const clause = match[1].trim();
        const star = clause.match(/^\*\s+as\s+(\w+)$/);
        if (star) {
            bindings.push(star[1]);
            continue;
        }
        const named = clause.match(/\{([^}]*)\}/);
        if (named) {
            for (const part of named[1].split(',')) {
                const name = part.trim().replace(/^type\s+/, '');
                if (!name) continue;
                const alias = name.match(/^\w+\s+as\s+(\w+)$/);
                bindings.push(alias ? alias[1] : name.split(/\s+/)[0]);
            }
        }
        const defaultImport = clause.match(/^(\w+)\s*(?:,|$)/);
        if (defaultImport) {
            bindings.push(defaultImport[1]);
        }
    }
    return bindings;
}

// Joint API symbols the variant's code uses, from its imports of Joint
// packages. Named imports are recorded directly (GraphProvider); bindings
// used as namespaces are resolved one level through member access
// (ui.Stencil, shapes.standard.Rectangle). Never-imported symbols are
// never recorded, even if referenced.
export function extractUses(sources) {
    const uses = new Set();
    for (const source of sources) {
        for (const binding of importedBindings(source)) {
            const memberRe = new RegExp(`\\b${binding}\\.(\\w+(?:\\.\\w+)?)`, 'g');
            let found = false;
            for (const member of source.matchAll(memberRe)) {
                uses.add(`${binding}.${member[1]}`);
                found = true;
            }
            if (!found) {
                uses.add(binding);
            }
        }
    }
    return [...uses].sort();
}

function cleanInline(text) {
    return text
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, '')
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
        .map(cleanInline)
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    const keywords = [...markdown.matchAll(/^\s*[-*]\s+\*\*([^*]+)\*\*/gm)]
        .map((match) => match[1].trim().toLowerCase());
    return { title, summary, keywords };
}

function yaml(value) {
    return JSON.stringify(value);
}

export function buildManifest({ demoName, variantDir, version, readme, packageJson, files, sources }) {
    const { title, summary, keywords: readmeKeywords } = parseReadme(readme);
    const variant = canonicalVariant(variantDir);
    const packages = jointPackages(packageJson);
    const demoEdition = edition(packages, title);
    const demoId = `version-${version}/${demoName}/${variantDir}`;
    const keywords = [...new Set([...demoName.split('-'), ...readmeKeywords])];
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
        `**Keywords:** ${keywords.join(', ')}`,
        '',
        `**Uses:** ${uses.join(', ') || 'none'}`,
        '',
        '## Files',
        '',
        ...files.map((file) => `- ${file}`),
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
