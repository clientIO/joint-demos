#!/usr/bin/env bash
set -euo pipefail

# Usage: test-demos.sh [--force] [--jobs N] [--demos a,b,c] [demo-name...]
# When demo names or --demos are provided, only those demos are tested.
# When neither is, all demos are tested. Both forms add to the same list, and a
# name matching no demo stops the run before anything is installed.
# --force:      keep going after a demo fails (default: stop starting new ones)
# --jobs N:     how many demos to work on at once (default: the machine's cores, max 4)
# --demos a,b:  test only these demos (repeatable, comma-separated)
#
# This is the testing counterpart of build-demos.sh, and deliberately a separate
# script rather than a mode of that one. build-demos.sh assembles _site/ for the
# Pages deployment and must not be able to fail over a test; this one never
# writes _site/ and exists to fail loudly. The two share no code on purpose:
# deploy.yml depends on build-demos.sh, and a change made for the test side
# should not be able to reach it.
#
# Each demo is installed, built and then tested in its own directory. Building
# is part of the test: the scheduled joint-plus run exists to find out whether
# every demo still compiles against a fresh @joint/* build, and a demo that no
# longer builds has failed whether or not it defines any tests.
#
# Demos are independent, so they are worked on several at a time. The work is
# mostly npm waiting on the network, which is exactly what overlaps well.
#
# Each demo's output is captured to its own log and printed when it finishes,
# so the logs stay readable instead of interleaving.
#
# A demo that defines a `test` script also has `npm test` run against it. Most
# demos define none, and that is not a failure - only a test that runs and
# fails marks the demo failed.
#
# Set CLEANUP=1 to delete each demo's node_modules and dist once it is done. A
# CI runner does not have room for every demo's dependencies at once. It is
# opt-in because it is destructive to a local checkout.

FORCE=false
JOBS=""
SELECTED=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --force) FORCE=true; shift ;;
        --jobs)
            # Each branch shifts what it consumed, rather than shifting once at
            # the bottom for everyone: `--jobs` eats two arguments, and a shared
            # shift ran off the end of the list when it came last.
            if [[ $# -lt 2 ]]; then
                echo "test-demos.sh: --jobs needs a number" >&2
                exit 2
            fi
            JOBS="$2"; shift 2 ;;
        --jobs=*) JOBS="${1#--jobs=}"; shift ;;
        --demos)
            if [[ $# -lt 2 ]]; then
                echo "test-demos.sh: --demos needs a comma-separated list" >&2
                exit 2
            fi
            IFS=',' read -r -a _added <<< "$2"
            SELECTED+=(${_added[@]+"${_added[@]}"}); shift 2 ;;
        --demos=*)
            IFS=',' read -r -a _added <<< "${1#--demos=}"
            SELECTED+=(${_added[@]+"${_added[@]}"}); shift ;;
        # Bare names join the same list as --demos, so the two combine cleanly
        # (`charts kanban` = `--demos charts,kanban`).
        *) SELECTED+=("$1"); shift ;;
    esac
done

# Empty entries come from a stray comma (`--demos a,,b`) or an empty argument,
# and would otherwise silently match nothing, so they are dropped rather than
# carried into the plan.
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
    # Four is where the gain flattens out on a two-core runner: the work is
    # waiting on the network more than on the CPU.
    JOBS=$(( cores > 4 ? 4 : cores ))
fi

# Checked as text before it is used as a number: `[[ x -ge 1 ]]` evaluates its
# operands arithmetically, so a value like `3x` is a bash error rather than a
# comparison, and `auto` quietly reads as zero.
if [[ ! "$JOBS" =~ ^[0-9]+$ ]] || (( JOBS < 1 )); then
    echo "test-demos.sh: --jobs must be a whole number of 1 or more, got '$JOBS'" >&2
    exit 2
fi

CONFIG_FILE="demos.config.json"

# Opt-in, and read once here so the run loop only tests a boolean.
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
# per lookup — three per demo, several hundred interpreter starts per run, all
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
# Plan: resolve every demo's variant and flags before installing anything
# ---------------------------------------------------------------------------

SKIPPED=()
KNOWN=()

for demo_dir in */; do
    demo_name="${demo_dir%/}"

    # Skip dotfiles, _site, and node_modules
    case "$demo_name" in
        .* | _site | node_modules) continue ;;
    esac

    KNOWN+=("$demo_name")

    # If a selection is provided, skip demos that are not in it
    if ! is_selected "$demo_name"; then
        continue
    fi

    # Check demos.config.json for skip flag
    if [[ "$(demo_config "$demo_name" skip)" == "true" ]]; then
        # Planning diagnostics go to stderr, alongside the rest of the run's
        # warnings. Skips are also counted into the summary at the end.
        echo "Skipping $demo_name (skip=true in demos.config.json)" >&2
        SKIPPED+=("$demo_name")
        continue
    fi

    # Check demos.config.json for variant override, else use default fallback
    config_variant="$(demo_config "$demo_name" variant)"
    if [[ -n "$config_variant" ]]; then
        if [[ -d "$demo_dir/$config_variant" ]]; then
            work_dir="$demo_dir/$config_variant"
        else
            echo "WARNING: $demo_name variant '$config_variant' not found, falling back to default" >&2
            config_variant=""
        fi
    fi

    if [[ -z "$config_variant" ]]; then
        # Default fallback: ts/ → js/, else skip
        if [[ -d "$demo_dir/ts" ]]; then
            work_dir="$demo_dir/ts"
        elif [[ -d "$demo_dir/js" ]]; then
            work_dir="$demo_dir/js"
        else
            echo "Skipping $demo_name (no ts/ or js/ subdirectory — add a variant to demos.config.json)" >&2
            SKIPPED+=("$demo_name")
            continue
        fi
    fi

    # Check for build flags override in config
    config_build_flags="$(demo_config "$demo_name" buildFlags)"
    if [[ -n "$config_build_flags" ]]; then
        build_flags="$config_build_flags"
    elif grep -q 'vite build' "$work_dir/package.json" 2>/dev/null; then
        build_flags="--base=./ --mode=production"
    else
        build_flags="--mode=production"
    fi

    printf '%s\t%s\t%s\n' "$demo_name" "$work_dir" "$build_flags" >> "$PLAN"
done

# A selected name matching no directory is a typo or a stale name, and silence
# here is the expensive kind: the run would test whatever else matched and exit
# 0, so CI reports success for a demo it never touched. Callers are especially
# exposed - joint-plus asks for a `demos_ref` that falls back to the default
# branch, where a name added on another branch does not exist yet.
# A selected demo that exists but is skipped by demos.config.json is not this:
# that is deliberate, and the summary already counts it.
UNKNOWN=()
for name in ${SELECTED[@]+"${SELECTED[@]}"}; do
    matched=false
    for known in ${KNOWN[@]+"${KNOWN[@]}"}; do
        [[ "$name" == "$known" ]] && { matched=true; break; }
    done
    [[ "$matched" == true ]] || UNKNOWN+=("$name")
done
if [[ ${#UNKNOWN[@]} -gt 0 ]]; then
    echo "test-demos.sh: no such demo: ${UNKNOWN[*]}" >&2
    exit 2
fi

PLANNED=$(wc -l < "$PLAN" | tr -d ' ')

echo "Testing $PLANNED demos, $JOBS at a time"
echo ""

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

# Whether a demo defines its own `test` script. Read from package.json rather
# than run speculatively: `npm test` on a package without one still exits 0,
# which would make "tested" and "has no tests" indistinguishable in the log.
has_test_script() {
    node -e '
        const { readFileSync } = require("fs");
        const pkg = JSON.parse(readFileSync(process.argv[1] + "/package.json", "utf8"));
        process.exit(pkg.scripts?.test ? 0 : 1);
    ' "$1" 2>/dev/null
}

# One demo, start to finish. Never exits non-zero: the outcome is a file, so
# that a failure cannot take its shard down with it. The status is one of
# `tested` (built, and its tests passed), `built` (built, defines no tests) or
# `failed`.
test_demo() {
    local demo_name="$1" work_dir="$2" build_flags="$3"
    local log="$WORK_DIR/logs/$demo_name" status="$WORK_DIR/status/$demo_name"

    {
        echo "Building $demo_name from $work_dir ($build_flags)"
        # The registry token is what fetches the packages, and it is needed for
        # nothing after that. It is therefore present for the install and gone
        # for everything that follows, so that no third-party code runs while
        # it is readable: `--ignore-scripts` holds back the dependencies' own
        # install scripts, and the `npm rebuild` below runs them once the token
        # has been dropped. A demo's build and test never see it at all.
        #
        # Chained with `&&`, not newlines: `set -e` does not apply inside an
        # `if` condition, so a step that fails there otherwise lets the next one
        # run anyway - a failed `cd` would install into the wrong directory, and
        # a failed install would still be judged by whether the build that
        # followed it happened to succeed.
        if (
            cd "$work_dir" &&
            npm install --ignore-scripts &&
            unset JOINTJS_NPM_TOKEN &&
            npm rebuild &&
            npm run build -- $build_flags
        ); then
            # A build that produces no dist/ has not really built. Checked here
            # for the same reason build-demos.sh checks it - a silently empty
            # build is the failure most likely to go unnoticed - but nothing is
            # copied anywhere: assembling _site/ is build-demos.sh's job.
            if [[ -d "$work_dir/dist" ]]; then
                if has_test_script "$work_dir"; then
                    echo "Testing $demo_name"
                    # Without the token, as above: a demo's tests have no
                    # business reaching the registry.
                    if (cd "$work_dir" && unset JOINTJS_NPM_TOKEN && npm test); then
                        echo "Done $demo_name"
                        echo tested > "$status"
                    else
                        echo "FAILED: $demo_name tests failed"
                        echo failed > "$status"
                    fi
                else
                    echo "Done $demo_name (no test script)"
                    echo built > "$status"
                fi
            else
                echo "FAILED: $demo_name built but no dist/ found"
                echo failed > "$status"
            fi
        else
            echo "FAILED: $demo_name build failed"
            echo failed > "$status"
        fi

        # Reclaimed here rather than at the end of the run: with several demos
        # in flight, only what is being worked on has to fit on disk at once.
        # A failed demo is cleaned too — its log already holds the diagnosis,
        # and a run with failures is the one most likely to be short of space
        # by the time it finishes.
        if [[ "$CLEANUP" == true ]]; then
            for disposable in node_modules dist; do
                rm -rf "${work_dir:?}/$disposable"
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
        while IFS=$'\t' read -r demo_name work_dir build_flags; do
            if (( line++ % JOBS != shard )); then continue; fi
            [[ -e "$ABORT" ]] && break
            # `< /dev/null` because this loop's stdin is the plan itself, and a
            # demo inherits it. Anything that reads stdin - a watch-mode test
            # runner, a tool that stops to ask a question - then eats the lines
            # for the demos after it, which are silently never run.
            test_demo "$demo_name" "$work_dir" "$build_flags" < /dev/null
        done < "$PLAN"
    ) &
done
wait

# ---------------------------------------------------------------------------
# Collect
# ---------------------------------------------------------------------------

TESTED=()
BUILT=()
FAILED=()
NOT_RUN=()

while IFS=$'\t' read -r demo_name _ _; do
    log="$WORK_DIR/logs/$demo_name"
    [[ -f "$log" ]] && cat "$log"
    case "$(cat "$WORK_DIR/status/$demo_name" 2>/dev/null || echo)" in
        tested) TESTED+=("$demo_name"); BUILT+=("$demo_name") ;;
        built) BUILT+=("$demo_name") ;;
        failed) FAILED+=("$demo_name") ;;
        # Never started: a demo earlier in the run failed and --force was off.
        *) NOT_RUN+=("$demo_name") ;;
    esac
done < "$PLAN"

echo ""
echo "=== Test summary ==="
echo "Built: ${#BUILT[@]} demos"
echo "Tested: ${#TESTED[@]} demos"
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
    if [[ ${#FAILED[@]} -gt 0 ]]; then
        echo "Not started after a failure: ${#NOT_RUN[@]} demos (pass --force to run them anyway)"
    else
        # Nothing failed, so nothing asked for these to be abandoned: a shard
        # died, or something ate the plan. Either way the run covered less than
        # it was told to, which is the one outcome that must never be reported
        # as success - the same reason an unknown demo name stops the run.
        echo "Not run, and nothing failed to explain it: ${#NOT_RUN[@]} demos: ${NOT_RUN[*]}"
    fi
fi

# A demo that was planned and never reached counts against the run too.
if [[ ${#FAILED[@]} -gt 0 || ${#NOT_RUN[@]} -gt 0 ]]; then
    exit 1
fi
