// Runnable self-check for toggleGroupCollapse. Kept out of the shipped module so
// `node:assert` never enters the browser bundle.

import assert from 'node:assert';
import { GROUP_HEADER } from '../model/layout';
import type { GroupCellData } from '../model/cell-data';
import { toggleGroupCollapse } from './group-collapse';

// Collapse shrinks + remembers the expanded height; expand restores it.
export function runGroupCollapseCheck(): void {
    const data: GroupCellData = { kind: 'group', group: { id: 'g', name: 'G', collapsed: false }};
    const collapsed = toggleGroupCollapse({ width: 300, height: 520 }, data);
    assert.strictEqual(collapsed.size.height, GROUP_HEADER, 'collapse shrinks to header');
    assert.strictEqual(collapsed.data.expandedHeight, 520, 'collapse remembers height');
    assert.strictEqual(collapsed.data.group.collapsed, true, 'collapse sets the flag');

    const expanded = toggleGroupCollapse(collapsed.size, collapsed.data);
    assert.strictEqual(expanded.size.height, 520, 'expand restores the remembered height');
    assert.strictEqual(expanded.data.group.collapsed, false, 'expand clears the flag');
}
