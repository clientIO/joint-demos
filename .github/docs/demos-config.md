# demos.config.json

Per-demo configuration for the build/deploy pipeline. Lives at the repository root.

## Schema

```json
{
  "demos": {
    "<demo-name>": {
      "skip": true,
      "variant": "vue-ts",
      "buildFlags": "--minify",
      "unlisted": true
    }
  }
}
```

Demos not listed in the config use default behavior. All fields are optional.

## Fields

| Field | Type | Used by | Description |
|-------|------|---------|-------------|
| `skip` | `boolean` | build script | Skip build and deploy entirely. The demo appears in the "Skipped" summary. |
| `variant` | `string` | build script | Subdirectory to build (e.g. `"vue-ts"`, `"react-ts"`). Overrides the default `ts` → `js` fallback. If the directory doesn't exist, falls back to default. |
| `buildFlags` | `string` | build script | Overrides the default flags passed to `npm run build`. When not set, defaults to `--base=./ --mode=production` for Vite projects or `--mode=production` for others. Use this for frameworks that need different flags (e.g. `"--configuration production"` for Angular). |
| `viewport` | `object` | screenshot script | Custom viewport size `{ "width": N, "height": N }` for screenshots. Defaults to 1024x768. |
| `unlisted` | `boolean` | CLI tooling | Hides the demo from `@joint/cli list`. Still builds and deploys normally. |
| `skipScreenshotComparison` | `boolean` | compare-screenshots script | Excludes the demo from screenshot regression comparison only. Unlike `skip`, it has no effect on build-demos.sh, test-all.sh or screenshot-demos.mjs — the demo still builds, tests and deploys normally. |
| `screenshotThreshold` | `number` | compare-screenshots script | Per-demo max allowed % of differing pixels before the demo is flagged as mismatched. Overrides the script's `--threshold` value (default: 1). |

## Default behavior

When a demo has no entry in the config, the build script picks the first available subdirectory in this order:

1. `ts/`
2. `js/`
3. Skip (with a message suggesting to add a `variant` to the config)

## Examples

Skip a demo from build/deploy:

```json
{
  "demos": {
    "bpmn-camunda-integration": {
      "skip": true
    }
  }
}
```

Build a specific variant instead of the default:

```json
{
  "demos": {
    "chatbot": {
      "variant": "vue-ts"
    }
  }
}
```

Override build flags (e.g. for Angular projects that don't accept `--mode`):

```json
{
  "demos": {
    "data-pipeline": {
      "variant": "angular",
      "buildFlags": "--configuration production"
    }
  }
}
```

Exclude a demo from screenshot regression comparison, while still building/deploying it normally, and raise its diff threshold to tolerate a noisier render:

```json
{
  "demos": {
    "bpmn-editor": {
      "skipScreenshotComparison": true
    },
    "marey-chart": {
      "screenshotThreshold": 3
    }
  }
}
```

## Related files

- [`demos.config.json`](../../demos.config.json) — the config file
- [`.github/scripts/build-demos.sh`](../scripts/build-demos.sh) — the build script that reads it
- [`.github/docs/build-demos.md`](./build-demos.md) — documentation for the build script
- [`.github/scripts/test-all.sh`](../scripts/test-all.sh) — the test script, which reads the same `variant`, `skip` and `buildFlags` fields
- [`.github/docs/test-all.md`](./test-all.md) — documentation for the test script
