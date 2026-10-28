import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setLayout } from './edit-source.ts';

const BODY = 'flowchart TD\n  a --> b\n';

describe('setLayout', () => {
    it('adds the front matter for elk', () => {
        assert.equal(setLayout(BODY, 'elk'), `---\nconfig:\n  layout: elk\n---\n${BODY}`);
    });

    it('leaves a source without front matter alone for dagre', () => {
        assert.equal(setLayout(BODY, 'dagre'), BODY);
    });

    it('removes the front matter it added', () => {
        assert.equal(setLayout(`---\nconfig:\n  layout: elk\n---\n${BODY}`, 'dagre'), BODY);
    });

    it('adds the config block next to other front matter keys', () => {
        assert.equal(
            setLayout(`---\ntitle: Order\n---\n${BODY}`, 'elk'),
            `---\ntitle: Order\nconfig:\n  layout: elk\n---\n${BODY}`
        );
    });

    it('keeps other keys when removing the layout', () => {
        assert.equal(
            setLayout(`---\ntitle: Order\nconfig:\n  layout: elk\n  look: neo\n---\n${BODY}`, 'dagre'),
            `---\ntitle: Order\nconfig:\n  look: neo\n---\n${BODY}`
        );
    });

    it('drops an emptied config block but keeps the rest', () => {
        assert.equal(
            setLayout(`---\ntitle: Order\nconfig:\n  layout: elk\n---\n${BODY}`, 'dagre'),
            `---\ntitle: Order\n---\n${BODY}`
        );
    });

    it('rewrites an existing layout in the config indentation', () => {
        assert.equal(
            setLayout(`---\nconfig:\n    look: neo\n    layout: dagre\n---\n${BODY}`, 'elk'),
            `---\nconfig:\n    look: neo\n    layout: elk\n---\n${BODY}`
        );
    });

    it('does not touch a nested layout key', () => {
        assert.equal(
            setLayout(`---\nconfig:\n  flowchart:\n    layout: x\n---\n${BODY}`, 'elk'),
            `---\nconfig:\n  layout: elk\n  flowchart:\n    layout: x\n---\n${BODY}`
        );
    });

    it('refuses a flow-style config', () => {
        assert.equal(setLayout(`---\nconfig: { look: neo }\n---\n${BODY}`, 'elk'), null);
    });

    it('refuses a source without a flowchart header', () => {
        assert.equal(setLayout('sequenceDiagram\n  a->>b: hi\n', 'elk'), null);
    });
});
