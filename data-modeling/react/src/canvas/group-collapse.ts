// Pure collapse geometry for a group cell. Collapsing remembers the expanded
// height and shrinks the group to its header bar; expanding restores it.
//
// This MUST flow through the controlled cells (setCell in group-container.tsx),
// never a raw `dia.Element.resize()`: in controlled mode the cells array is the
// source of truth, so a raw resize is immediately overwritten by the next
// controlled-cells render (that was the bug where a collapsed group stayed full
// height while only its children hid).

import { GROUP_HEADER } from '../model/layout';
import type { GroupCellData } from '../model/cell-data';

interface Size {
  readonly width: number;
  readonly height: number;
}

interface CollapseResult {
  readonly size: Size;
  readonly data: GroupCellData;
}

export function toggleGroupCollapse(size: Size, data: GroupCellData): CollapseResult {
    const collapsed = !data.group.collapsed;
    if (collapsed) {
        return {
            size: { width: size.width, height: GROUP_HEADER },
            data: { ...data, group: { ...data.group, collapsed: true }, expandedHeight: size.height },
        };
    }
    return {
        size: { width: size.width, height: data.expandedHeight ?? size.height },
        data: { ...data, group: { ...data.group, collapsed: false }},
    };
}
