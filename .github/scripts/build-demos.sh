#!/usr/bin/env bash
set -euo pipefail

# Usage: build-demos.sh [--force] [--jobs N] [--demos a,b,c] [--plus-only]
#                       [--list-only] [demo-name]
# When demo-name or --demos is provided, only those demos are built.
# When neither is, all demos are built.
# --force:      keep building after a demo fails (default: stop starting new ones)
# --jobs N:     how many demos to build at once (default: the machine's cores, max 4)
# --demos a,b:  build only these demos (repeatable, comma-separated)
# --plus-only:  build only demos that depend on a JointJS+ package
# --list-only:  print the demos that would be built, comma-separated, and stop
#
# Demos are independent — each installs and builds inside its own directory and
# copies its own output into _site — so they are built several at a time. The
# work is mostly npm waiting on the network, which is exactly what overlaps
# well; a run that took ~28 minutes in sequence is the reason this exists.
#
# Each demo's output is captured to its own log and printed when it finishes,
# so the logs stay readable instead of interleaving.
#
# Set CLEANUP=1 to delete each demo's node_modules and dist once its output has
# been copied into _site. A CI runner does not have room for every demo's
# dependencies at once, and nothing after the copy needs them. It is opt-in
# because it is destructive to a local checkout.

FORCE=false
FILTER=""
JOBS=""
PLUS_ONLY=false
LIST_ONLY=false
SELECTED=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --force) FORCE=true; shift ;;
        --plus-only) PLUS_ONLY=true; shift ;;
        --list-only) LIST_ONLY=true; shift ;;
        --jobs)
            # Each branch shifts what it consumed, rather than shifting once at
            # the bottom for everyone: `--jobs` eats two arguments, and a shared
            # shift ran off the end of the list when it came last.
            if [[ $# -lt 2 ]]; then
                echo "build-demos.sh: --jobs needs a number" >&2
                exit 2
            fi
            JOBS="$2"; shift 2 ;;
        --jobs=*) JOBS="${1#--jobs=}"; shift ;;
        --demos)
            if [[ $# -lt 2 ]]; then
                echo "build-demos.sh: --demos needs a comma-separated list" >&2
                exit 2
            fi
            IFS=',' read -r -a _added <<< "$2"
            SELECTED+=(${_added[@]+"${_added[@]}"}); shift 2 ;;
        --demos=*)
            IFS=',' read -r -a _added <<< "${1#--demos=}"
            SELECTED+=(${_added[@]+"${_added[@]}"}); shift ;;
        # A bare name still works, and is kept separate from --demos so that the
        # long-standing single-demo form keeps its exact meaning.
        *) FILTER="$1"; shift ;;
    esac
done

if [[ -n "$FILTER" ]]; then
    SELECTED+=("$FILTER")
fi

# Empty entries come from a stray comma (`--demos a,,b`) and would otherwise
# silently match nothing, so they are dropped rather than carried into the plan.
if [[ ${#SELECTED[@]} -gt 0 ]]; then
    _kept=()
    for name in "${SELECTED[@]}"; do
        [[ -n "$name" ]] && _kept+=("$name")
    done
    SELECTED=(${_kept[@]+"${_kept[@]}"})
fi

# Membership test for the selection, so the plan loop stays readable.
is_selected() {
    [[ ${#SELECTED[@]} -eq 0 ]] && return 0
    local name
    for name in "${SELECTED[@]}"; do
        [[ "$name" == "$1" ]] && return 0
    done
    return 1
}

if [[ -z "$JOBS" ]]; then
    cores="$( (nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4) )"
    # Four is where the gain flattens out on a two-core runner: the builds are
    # waiting on the network more than on the CPU.
    JOBS=$(( cores > 4 ? 4 : cores ))
fi

# Checked as text before it is used as a number: `[[ x -ge 1 ]]` evaluates its
# operands arithmetically, so a value like `3x` is a bash error rather than a
# comparison, and `auto` quietly reads as zero.
if [[ ! "$JOBS" =~ ^[0-9]+$ ]] || (( JOBS < 1 )); then
    echo "build-demos.sh: --jobs must be a whole number of 1 or more, got '$JOBS'" >&2
    exit 2
fi

SITE_DIR="_site"
CONFIG_FILE="demos.config.json"

# Opt-in, and read once here so the build loop only tests a boolean.
case "${CLEANUP:-}" in
    1 | true) CLEANUP=true ;;
    *) CLEANUP=false ;;
esac

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
PLAN="$WORK_DIR/plan"
CONFIG_DUMP="$WORK_DIR/config"
ABORT="$WORK_DIR/abort"
mkdir -p "$WORK_DIR/logs" "$WORK_DIR/status"
: > "$PLAN"

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Dumped once, as `demo<TAB>field<TAB>value` lines. It used to be a `node -e`
# per lookup — four per demo, several hundred interpreter starts per run, all
# to read one small file.
: > "$CONFIG_DUMP"
if [[ -f "$CONFIG_FILE" ]]; then
    node -e "
        const cfg = require('./$CONFIG_FILE');
        for (const [demo, fields] of Object.entries(cfg.demos ?? {})) {
            for (const [field, value] of Object.entries(fields ?? {})) {
                if (value === null || typeof value === 'object') continue;
                process.stdout.write(\`\${demo}\t\${field}\t\${value}\n\`);
            }
        }
    " > "$CONFIG_DUMP"
fi

demo_config() {
    awk -F'\t' -v demo="$1" -v field="$2" '$1 == demo && $2 == field { print $3; exit }' "$CONFIG_DUMP"
}

# ---------------------------------------------------------------------------
# Plan: resolve every demo's variant and flags before building anything
# ---------------------------------------------------------------------------

SKIPPED=()

for demo_dir in */; do
    demo_name="${demo_dir%/}"

    # Skip dotfiles, _site, and node_modules
    case "$demo_name" in
        .* | _site | node_modules) continue ;;
    esac

    # If a selection is provided, skip demos that are not in it
    if ! is_selected "$demo_name"; then
        continue
    fi

    # Check demos.config.json for skip flag
    if [[ "$(demo_config "$demo_name" skip)" == "true" ]]; then
        # Planning diagnostics go to stderr so that --list-only's stdout is
        # nothing but demo names, and stays usable as input to --demos.
        echo ":: Skipping $demo_name (skip=true in demos.config.json)" >&2
        SKIPPED+=("$demo_name")
        continue
    fi

    # Check demos.config.json for variant override, else use default fallback
    config_variant="$(demo_config "$demo_name" variant)"
    if [[ -n "$config_variant" ]]; then
        if [[ -d "$demo_dir/$config_variant" ]]; then
            build_dir="$demo_dir/$config_variant"
        else
            echo ":: WARNING: $demo_name variant '$config_variant' not found, falling back to default" >&2
            config_variant=""
        fi
    fi

    if [[ -z "$config_variant" ]]; then
        # Default fallback: ts/ → js/, else skip
        if [[ -d "$demo_dir/ts" ]]; then
            build_dir="$demo_dir/ts"
        elif [[ -d "$demo_dir/js" ]]; then
            build_dir="$demo_dir/js"
        else
            echo ":: Skipping $demo_name (no ts/ or js/ subdirectory — add a variant to demos.config.json)" >&2
            SKIPPED+=("$demo_name")
            continue
        fi
    fi

    # Check for build flags override in config
    config_build_flags="$(demo_config "$demo_name" buildFlags)"
    if [[ -n "$config_build_flags" ]]; then
        build_flags="$config_build_flags"
    elif grep -q 'vite build' "$build_dir/package.json" 2>/dev/null; then
        build_flags="--base=./ --mode=production"
    else
        build_flags="--mode=production"
    fi

    printf '%s\t%s\t%s\n' "$demo_name" "$build_dir" "$build_flags" >> "$PLAN"
done

# Applied to the finished plan, in one node pass, because it has to read the
# dependency fields rather than the text of package.json: the `overrides` block
# that link-local-packages.mjs adds names every local package, so a demo that
# uses only @joint/core still mentions @joint/plus once it has been linked.
if [[ "$PLUS_ONLY" == true ]]; then
    node -e "
        const { readFileSync, writeFileSync } = require('fs');
        const plus = /^@joint\/(plus|react-plus|format-visio|format-bpmn-import|format-bpmn-export|shapes-vsm)$/;
        const kept = readFileSync(process.argv[1], 'utf8').split('\n').filter(Boolean).filter((line) => {
            const buildDir = line.split('\t')[1];
            let pkg;
            try {
                pkg = JSON.parse(readFileSync(buildDir + '/package.json', 'utf8'));
            } catch {
                return false;
            }
            return ['dependencies', 'devDependencies']
                .some((f) => Object.keys(pkg[f] ?? {}).some((name) => plus.test(name)));
        });
        writeFileSync(process.argv[1], kept.map((l) => l + '\n').join(''));
    " "$PLAN"
fi

PLANNED=$(wc -l < "$PLAN" | tr -d ' ')

# Printed before anything is removed or built, so that checking what a set of
# filters selects stays a read-only operation.
if [[ "$LIST_ONLY" == true ]]; then
    # Comma-separated, which is exactly what --demos parses, so the two compose
    # without reshaping: `--demos "$(... --list-only)"`. One name per line would
    # read better on a terminal, but --demos splits on commas only, so feeding
    # it back would produce a single name with newlines in it and build nothing.
    cut -f1 "$PLAN" | paste -sd, -
    exit 0
fi

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"

echo ":: Building $PLANNED demos, $JOBS at a time"
echo ""

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

# One demo, start to finish. Never exits non-zero: the outcome is a file, so
# that a failure cannot take its shard down with it.
build_demo() {
    local demo_name="$1" build_dir="$2" build_flags="$3"
    local log="$WORK_DIR/logs/$demo_name" status="$WORK_DIR/status/$demo_name"

    {
        echo ":: Building $demo_name from $build_dir ($build_flags)"
        if (
            cd "$build_dir"
            npm install --ignore-scripts=false
            npm run build -- $build_flags
        ); then
            if [[ -d "$build_dir/dist" ]]; then
                # Created rather than left to `cp`: whether `cp -r src/. dest/`
                # makes a missing destination differs between implementations,
                # and it costs nothing to not depend on it.
                mkdir -p "$SITE_DIR/$demo_name"
                cp -r "$build_dir/dist/." "$SITE_DIR/$demo_name/"
                echo ":: Done $demo_name"
                echo built > "$status"
            else
                echo ":: FAILED: $demo_name built but no dist/ found"
                echo failed > "$status"
            fi
        else
            echo ":: FAILED: $demo_name build failed"
            echo failed > "$status"
        fi

        # Reclaimed here rather than at the end of the run: with several demos
        # in flight, only what is being built has to fit on disk at once.
        # A failed demo is cleaned too — its log already holds the diagnosis,
        # and a run with failures is the one most likely to be short of space
        # by the time it finishes.
        if [[ "$CLEANUP" == true ]]; then
            for disposable in node_modules dist; do
                rm -rf "${build_dir:?}/$disposable"
            done
        fi
    } > "$log" 2>&1

    # Without --force, a failure stops any demo that has not started yet. The
    # ones already running are left to finish — killing a half-done npm install
    # buys nothing and makes the logs harder to read.
    if [[ "$(cat "$status")" == failed && "$FORCE" != true ]]; then
        touch "$ABORT"
    fi
}

# Demos are dealt round-robin across the shards, and each shard works through
# its own list. Static sharding rather than a work queue because it needs
# nothing but `wait`: no `wait -n` (bash 4.3+), no GNU xargs.
for (( shard = 0; shard < JOBS; shard++ )); do
    (
        line=0
        while IFS=$'\t' read -r demo_name build_dir build_flags; do
            if (( line++ % JOBS != shard )); then continue; fi
            [[ -e "$ABORT" ]] && break
            build_demo "$demo_name" "$build_dir" "$build_flags"
        done < "$PLAN"
    ) &
done
wait

# ---------------------------------------------------------------------------
# Collect
# ---------------------------------------------------------------------------

BUILT=()
FAILED=()
NOT_RUN=()

while IFS=$'\t' read -r demo_name _ _; do
    log="$WORK_DIR/logs/$demo_name"
    [[ -f "$log" ]] && cat "$log"
    case "$(cat "$WORK_DIR/status/$demo_name" 2>/dev/null || echo)" in
        built) BUILT+=("$demo_name") ;;
        failed) FAILED+=("$demo_name") ;;
        # Never started: a demo earlier in the run failed and --force was off.
        *) NOT_RUN+=("$demo_name") ;;
    esac
done < "$PLAN"

# Generate index.html
INDEX_FILE="$SITE_DIR/index.html"
cat > "$INDEX_FILE" <<'HEADER'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JointJS Demos</title>
</head>
<body>
    <h1>JointJS Demos</h1>
    <ul>
HEADER

for demo in ${BUILT[@]+"${BUILT[@]}"}; do
    echo "        <li><a href=\"./$demo/\">$demo</a></li>" >> "$INDEX_FILE"
done

cat >> "$INDEX_FILE" <<'FOOTER'
    </ul>
</body>
</html>
FOOTER

echo ""
echo "=== Build summary ==="
echo "Built: ${#BUILT[@]} demos"
if [[ ${#FAILED[@]} -gt 0 ]]; then
    echo "Failed: ${#FAILED[@]} demos: ${FAILED[*]}"
else
    echo "Failed: 0"
fi
if [[ ${#SKIPPED[@]} -gt 0 ]]; then
    echo "Skipped: ${#SKIPPED[@]} demos: ${SKIPPED[*]}"
else
    echo "Skipped: 0"
fi
if [[ ${#NOT_RUN[@]} -gt 0 ]]; then
    echo "Not started after a failure: ${#NOT_RUN[@]} demos (pass --force to build them anyway)"
fi

if [[ ${#FAILED[@]} -gt 0 ]]; then
    exit 1
fi
