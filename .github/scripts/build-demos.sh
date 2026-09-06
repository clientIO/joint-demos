#!/usr/bin/env bash
set -euo pipefail

# Usage: build-demos.sh [--force] [--jobs N] [demo-name]
# When demo-name is provided, only that demo is built.
# When omitted, all demos are built.
# --force:  keep building after a demo fails (default: stop starting new ones)
# --jobs N: how many demos to build at once (default: the machine's cores, max 4)
#
# Demos are independent — each installs and builds inside its own directory and
# copies its own output into _site — so they are built several at a time. The
# work is mostly npm waiting on the network, which is exactly what overlaps
# well; a run that took ~28 minutes in sequence is the reason this exists.
#
# Each demo's output is captured to its own log and printed when it finishes,
# so the logs stay readable instead of interleaving.

FORCE=false
FILTER=""
JOBS=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --force) FORCE=true ;;
        --jobs) shift; JOBS="${1:-}" ;;
        --jobs=*) JOBS="${1#--jobs=}" ;;
        *) FILTER="$1" ;;
    esac
    shift
done

if [[ -z "$JOBS" ]]; then
    cores="$( (nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4) )"
    # Four is where the gain flattens out on a two-core runner: the builds are
    # waiting on the network more than on the CPU.
    JOBS=$(( cores > 4 ? 4 : cores ))
fi
[[ "$JOBS" -ge 1 ]] || JOBS=1

SITE_DIR="_site"
CONFIG_FILE="demos.config.json"

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

    # If a filter is provided, skip non-matching demos
    if [[ -n "$FILTER" && "$demo_name" != "$FILTER" ]]; then
        continue
    fi

    # Check demos.config.json for skip flag
    if [[ "$(demo_config "$demo_name" skip)" == "true" ]]; then
        echo ":: Skipping $demo_name (skip=true in demos.config.json)"
        SKIPPED+=("$demo_name")
        continue
    fi

    # Check demos.config.json for variant override, else use default fallback
    config_variant="$(demo_config "$demo_name" variant)"
    if [[ -n "$config_variant" ]]; then
        if [[ -d "$demo_dir/$config_variant" ]]; then
            build_dir="$demo_dir/$config_variant"
        else
            echo ":: WARNING: $demo_name variant '$config_variant' not found, falling back to default"
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
            echo ":: Skipping $demo_name (no ts/ or js/ subdirectory — add a variant to demos.config.json)"
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

PLANNED=$(wc -l < "$PLAN" | tr -d ' ')

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
