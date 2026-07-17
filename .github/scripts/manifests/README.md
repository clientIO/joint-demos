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
summary, feature keywords, the Joint API symbols the code uses, and the
variant's file list.

Rules of thumb:

- **Uses** lists Joint API symbols extracted from imports of Joint
  packages: named imports directly (`GraphProvider`), namespace bindings
  resolved through member access (`ui.Stencil`, `shapes.standard.Rectangle`).

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
