# Demo Manifests

Builds one searchable **Demo Manifest** per demo **Variant**, so the
JointJS MCP demo search ranks catalog entries (title, summary, keywords,
packages) instead of raw source chunks, and a variant search is a plain
folder filter. Vocabulary (Manifest, Variant, Demo Snapshot, Edition)
follows `CONTEXT.md` in the
[joint-mcp](https://github.com/clientIO/joint-mcp) repo.

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
      js/<demo>.md         # one Manifest per emitted variant,
      ts/<demo>.md         # YAML frontmatter + one variant's catalog entry
      react/<demo>.md
      angular/<demo>.md
```

One Manifest per emitted variant at `version-X.Y/<variant>/<demo>.md` —
the variant folder precedes the demo name so the worker's variant filter is
a single AI Search folder filter. Emitted variant folders are the canonical
tokens `js`, `ts`, `react`, `angular` only; vue/svelte variants are not
emitted. Frontmatter is `demo`, `version`, `edition`, `title`. The body
carries the shared header (title + summary,
**Edition**, curated **Keywords**) followed by that variant's
`**demo_id:**` / `**Packages:**` / `**Uses:**` block and a
`**Variants:**` line naming the demo's *other* emitted variants (omitted
when there are none) — so the worker renders "also available as" without
runtime probing. `demo_id` (`version-X.Y/<demo>/<variant_dir>`) keeps the
actual variant directory name and matches the R2 `versioned_demos/` layout,
so `get_demo_code` resolves it unchanged.

Rules of thumb:

- **Hidden variants.** `HIDDEN_VARIANTS` in `transform.mjs` is an explicit
  demo/variant-dir blacklist of the imperative react variants (react
  variants built on `@joint/plus` instead of `@joint/react*`). They get no
  manifest document and never appear on a `Variants:` line, but their Demo
  Snapshot sources stay uploaded and `get_demo_code` serves them.
  The list is explicit, not derived from package contents. Two variant
  directories of one demo must not emit the same canonical variant —
  generation fails loudly if they do.
- **Title & summary** come from the **demo-root `README.md` only**; variant
  READMEs are not parsed. A demo with no root README is skipped entirely
  (`:: Skipping <demo> (no root README.md)`). A demo whose variants are all
  hidden or non-canonical emits nothing and warns
  (`:: <demo>: no emitted variants`).
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
- **No source-file listings.** Manifests carry no file inventory;
  filenames are not part of the search text. `get_demo_code` lists the
  real files live from `versioned_demos/`.
- **Packages** come from the variant's `package.json` `dependencies`
  (`@joint/*`, `jointjs`, `rappid`, `@clientio/rappid`). **Edition** is
  per-variant, keyed off that variant's joint packages; a variant with no
  joint dependency (CDN-loaded) falls back to a `JointJS+` title check.
- Every variant directory with a `package.json` is considered —
  `demos.config.json` `skip` flags are build-only and not honored here.

## R2 destination

Manifests are uploaded (by the sync step) to the demos bucket under a
top-level prefix, sibling of the demo source:

```
versioned_demos/version-4.3/<demo>/<variant>/…    # demo source
manifests/version-4.3/<variant>/<demo>.md         # search documents (this script)
```

The upload is scripted: `npm run sync -- --version X.Y` (dev bucket) /
`npm run sync:prod -- --version X.Y` (prod) syncs both prefixes and removes
any `manifests-index/` key for the version — see
`.github/scripts/sync.mjs`. It is sync-only and fails preflight unless this
script's build output for that version exists.

The AutoRAG demos index points at `manifests/` only; `get_demo_code` keeps
reading full source from `versioned_demos/`.
