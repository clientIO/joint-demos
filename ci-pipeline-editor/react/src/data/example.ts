import type { DiagramJSON } from './types';

/**
 * A CI/CD pipeline. After the checkout and the install, a fork runs the lint,
 * the tests and the build side by side; a decision picks the target: staging,
 * where a loop polls the smoke tests before the build is promoted, production,
 * or no deployment at all. A step `run`s a command, shown as code below
 * its label; the branches of the fork are named. Any id will do, but `source`, `target`,
 * `vertices`, `position`, `size` and `angle`: `ui.Inspector` takes a change
 * of an attribute of those names for a change of a cell's geometry and
 * ignores it, so a node with such an id would not refresh in the panel.
 */
export const example: DiagramJSON = {
    start: { type: 'start', to: [{ id: 'checkout' }] },
    checkout: { type: 'step', label: 'Checkout', run: 'git fetch --depth 1', comment: 'Shallow: the history is not needed.', to: [{ id: 'install' }] },
    install: { type: 'step', label: 'Install dependencies', run: 'npm ci', to: [{ id: 'jobs' }] },
    jobs: {
        type: 'fork',
        branches: [
            { id: 'lint', name: 'Quality' },
            { id: 'tests', name: 'Tests' },
            { id: 'build', name: 'Artifacts' }
        ],
        to: [{ id: 'deploy' }]
    },
    lint: { type: 'step', label: 'Lint', run: 'eslint . --max-warnings 0' },
    tests: { type: 'step', label: 'Unit tests', run: 'vitest run --coverage' },
    build: { type: 'step', label: 'Build', run: 'vite build' },
    deploy: {
        type: 'decision',
        label: 'Deploy target',
        to: [
            { id: 'staging', name: 'Staging' },
            { id: 'production', name: 'Production' },
            { id: 'skip', name: 'Skip' }
        ]
    },
    staging: { type: 'step', label: 'Deploy to staging', to: [{ id: 'poll' }] },
    poll: { type: 'loop', branches: [{ id: 'smoke' }], comment: 'Until the smoke tests pass.', to: [{ id: 'promote' }] },
    smoke: { type: 'step', label: 'Run smoke tests', run: 'playwright test --project smoke', to: [{ id: 'results' }] },
    results: { type: 'step', label: 'Collect results' },
    promote: { type: 'step', label: 'Promote build', run: 'git tag -f candidate', to: [{ id: 'staging-end' }] },
    'staging-end': { type: 'end' },
    production: { type: 'step', label: 'Deploy to production', to: [{ id: 'notify' }] },
    notify: { type: 'step', label: 'Notify team', run: 'slack post --channel releases', to: [{ id: 'production-end' }] },
    'production-end': { type: 'end' },
    skip: { type: 'step', label: 'Skip deployment', to: [{ id: 'skip-end' }] },
    'skip-end': { type: 'end' }
};
