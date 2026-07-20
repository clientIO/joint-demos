# Demo Manifests

Builds one searchable **Demo Manifest** per demo, so the JointJS MCP
demo search ranks catalog entries (title, summary, keywords, packages)
instead of raw source chunks. Each manifest carries a section per
**Variant**. Vocabulary (Manifest, Variant, Demo Snapshot, Edition)
follows `CONTEXT.md` in the
[joint-mcp](https://github.com/clientIO/joint-mcp) repo; the spec is
joint-mcp issue #27 (v3 layout: #39).

## Usage

```bash
# from the repo root
npm run manifests:build -- --version 4.3   # write .manifests/
npm run manifests:test                     # golden-fixture + unit tests
```

`--version` is required: this repo is unversioned, so the value labels the
Demo Snapshot the manifests describe (the JointJS version the demos target).
Manifests exist from snapshot 4.3 forward.

## Output

```
.manifests/
  manifests/
    version-4.3/
      <demo>.md            # one Manifest per demo, YAML frontmatter + per-variant sections
  manifests-index/
    version-4.3.json       # slim runtime index: bare array of { demo, variant_dir, variant }
```

One Manifest per demo, flat under `manifests/version-X.Y/`. Frontmatter is
`demo`, `version`, `edition`, `title`. A shared header (title + summary,
**Edition**, curated **Keywords**) precedes one `## Variant: <dir>` section
per variant, each carrying a `demo_id` / `**Packages:**` / `**Uses:**` block
followed by its `### Source files`. `demo_id`
(`version-X.Y/<demo>/<variant_dir>`) matches the R2 `versioned_demos/`
layout, so `get_demo_code` resolves it unchanged.

The `manifests-index/version-X.Y.json` is a bare array of
`{ demo, variant_dir, variant }` (canonical `variant`: `react-ts` →
`react`, `vue-ts` → `vue`) in generation order — the worker's framework
pre-filter source. It is deliberately kept **outside** the `manifests/`
prefix so the AutoRAG index never chunks it as searchable noise.

Rules of thumb:

- **Title & summary** come from the **demo-root `README.md` only**; variant
  READMEs are no longer parsed (they still appear under Source files). A demo
  with no root README is skipped entirely (`:: Skipping <demo> (no root
  README.md)`) — no manifest, no index entries.
- **Keywords** come solely from `demo-keywords.json` at the repo root, keyed
  by demo name (shared across variants). Authoring rule: keywords are the
  *synonym/expansion channel* — terms an agent might search for that the
  title and summary do **not** already contain. Prefer the established
  jointjs.com/demos vocabulary (application categories such as
  "Project management", "Data modeling"; feature tags such as "Drag & Drop",
  "Automatic layout"); free terms (diagram-type synonyms like "swimlane",
  "ERD") are allowed. Casing and order are preserved as authored. A demo
  missing from the overlay gets a build warning and no Keywords line; a
  keyword containing a comma is warned about and skipped (the body line is
  comma-joined).
- **Uses** lists collapsed runtime Joint API surfaces extracted from imports
  of Joint packages: named imports directly (`GraphProvider`), namespace
  bindings resolved through member access and collapsed after the first
  capitalized segment (`ui.Stencil`, `shapes.standard.Rectangle`,
  `dia.Paper.Options` → `dia.Paper`). Aliased imports are recorded under
  their original names, star imports without their local prefix;
  imported-but-unused bindings and the `jsx`/`env` tooling bindings are
  dropped.
- **Source files** is a curated view for orientation, not the full
  inventory (`get_demo_code` lists the real files live): lockfiles
  (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) and binary assets
  (png, jpg, jpeg, gif, ico, woff, woff2, ttf, eot, mp3, mp4) are excluded;
  `.svg` and config files are kept deliberately.
- **Packages** come from the variant's `package.json` `dependencies`
  (`@joint/*`, `jointjs`, `rappid`, `@clientio/rappid`). **Edition** is
  shared across the demo: `commercial` when any variant depends on
  `@joint/plus` or `@joint/react-plus` (or `rappid`/`@clientio/rappid`);
  demos with no joint dependency (CDN-loaded) fall back to a `JointJS+`
  title check.
- **Imperative-react advisory.** A `react` variant whose packages include no
  `@joint/react*` package gets a single advisory line after its
  `**Packages:**` line, steering agents to `get_started(framework="react")`
  and `@joint/react` (or `@joint/react-plus` under a JointJS+ license).
- Every variant directory with a `package.json` gets a section —
  `demos.config.json` `skip` flags are build-only and not honored here.

## R2 destination

Manifests are uploaded (by the sync step, joint-mcp#30) to the demos bucket
under two top-level prefixes, siblings of the demo source:

```
versioned_demos/version-4.3/<demo>/<variant>/…   # demo source (existing)
manifests/version-4.3/<demo>.md                  # search documents (this script)
manifests-index/version-4.3.json                 # framework pre-filter index (this script)
```

The upload is scripted: `npm run sync -- --version X.Y` (dev bucket) /
`npm run sync:prod -- --version X.Y` (prod) syncs all three prefixes —
see `.github/scripts/sync.mjs`. It is sync-only and fails preflight
unless this script's build output for that version exists.

The AutoRAG demos index points at `manifests/` only; the slim
`manifests-index/` sits outside it and `get_demo_code` keeps reading full
source from `versioned_demos/`.
