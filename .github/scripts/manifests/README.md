# Demo Manifests

Builds one searchable **Demo Manifest** per demo variant, so the JointJS MCP
demo search ranks catalog entries (title, summary, keywords, packages)
instead of raw source chunks. Vocabulary (Manifest, Variant, Demo Snapshot,
Edition) follows `CONTEXT.md` in the
[joint-mcp](https://github.com/clientIO/joint-mcp) repo; the spec is
joint-mcp issue #27.

## Usage

```bash
# from the repo root
npm run manifests:build -- --version 4.3   # write .manifests/version-4.3/
npm run manifests:test                     # golden-fixture + unit tests
```

`--version` is required: this repo is unversioned, so the value labels the
Demo Snapshot the manifests describe (the JointJS version the demos target).
Manifests exist from snapshot 4.3 forward.

## Output

```
.manifests/
  version-4.3/
    index.json            # one entry per variant: demo_id, title, variant, edition, packages
    <demo>/<variant>.md   # one Manifest per variant, YAML frontmatter + markdown body
```

Each Manifest carries: `demo_id` (matches the R2 `versioned_demos/` layout,
so `get_demo_code` resolves it unchanged), canonical `variant`
(`react-ts`/`react-redux-ts` → `react`, `vue-ts` → `vue`), `variant_dir`
(the actual directory), `version`, `edition`, `title`, `packages`, plus a
summary, curated Keywords, the Joint API symbols the code uses (Uses), and
its Source files.

Rules of thumb:

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
  (`@joint/*`, `jointjs`, `rappid`, `@clientio/rappid`). **Edition** is `commercial` when
  `@joint/plus` or `@joint/react-plus` is present; demos with no joint
  dependency (CDN-loaded) fall back to a `JointJS+` title check.
- The variant-level `README.md` is preferred; the demo-root `README.md` is
  the fallback.
- Every variant directory with a `package.json` gets a Manifest —
  `demos.config.json` `skip` flags are build-only and not honored here.

## R2 destination

Manifests are uploaded (by the sync step, joint-mcp#30) to the demos bucket
under a top-level `manifests/` prefix, a sibling of the demo source:

```
versioned_demos/version-4.3/<demo>/<variant>/…   # demo source (existing)
manifests/version-4.3/<demo>/<variant>.md        # search documents (this script)
```

The AutoRAG demos index points at `manifests/`; `get_demo_code` keeps
reading full source from `versioned_demos/`.
