import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { g, highlighters } from '@joint/core';

import { graph, paper } from '../app';
import { User } from './user';
import { init as initUserList, render as renderUserList } from './user-list';
import type { dia } from '@joint/core';

export { User };

const remoteUsers = new Map<string, User>();

// ---- Exports (assigned in init) ----

export let provider: WebrtcProvider;
export let localUser: User;

// ---- Init ----

export function init() {

    // Yjs sync

    const ydoc = new Y.Doc();
    const ymap = ydoc.getMap<dia.Cell.JSON>();

    graph.getCells().forEach((cell) => {
        ymap.set(cell.id as string, cell.toJSON({ ignoreDefaults: false }));
    });

    graph.on('change', (cell, opt) => {
        if (opt.remote) return;
        ymap.set(cell.id as string, cell.toJSON({ ignoreDefaults: false }));
    });

    graph.on('add', (cell, opt) => {
        if (opt.remote) return;
        ymap.set(cell.id as string, cell.toJSON({ ignoreDefaults: false }));
    });

    graph.on('remove', (cell, opt) => {
        if (opt.remote) return;
        ymap.delete(cell.id);
    });

    ymap.observe((event) => {
        event.keysChanged.forEach((key) => {
            const cellData = ymap.get(key);
            if (!cellData) {
                const cell = graph.getCell(key);
                if (cell) graph.removeCell(cell, { remote: true });
                return;
            }
            const cell = graph.getCell(key);
            if (cell) {
                const { id, type, ...restData } = cellData;
                cell.set(restData, { remote: true });
            } else {
                graph.addCell(cellData);
            }
        });
    });

    // WebRTC provider

    provider = new WebrtcProvider('jointjs-yjs', ydoc, {
        signaling: ['wss://jointjs-y-webrtc.duckdns.org'],
    });

    // Local user

    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5'];

    localUser = new User(
        'User ' + g.random(0, 1000).toString(),
        colors[Math.floor(Math.random() * colors.length)],
    );
    provider.awareness.setLocalStateField('user', localUser);

    initUserList(localUser, (newName) => {
        localUser.name = newName;
        provider.awareness.setLocalStateField('user', localUser);
    }, (editing) => {
        provider.awareness.setLocalStateField('editingName', editing);
    });

    // Awareness: cursors, selection highlights, user list

    provider.awareness.on('change', () => {
        const states = provider.awareness.getStates();
        const activeNames = new Set<string>();

        highlighters.mask.removeAll(paper, 'selection');
        highlighters.mask.removeAll(paper, 'editing');

        states.forEach((state) => {
            if (!state.user) return;
            const isLocal = state.user.name === localUser.name;

            if (!isLocal) {
                activeNames.add(state.user.name);

                let user = remoteUsers.get(state.user.name);
                if (!user) {
                    user = new User(state.user.name, state.user.color);
                    remoteUsers.set(state.user.name, user);
                }

                if (state.cursor) {
                    user.updateCursor(paper, state.cursor);
                } else {
                    user.removeCursor();
                }
            }

            const selection = state.selection || [];
            selection.forEach((id: string) => {
                const cell = graph.getCell(id);
                if (!cell) return;
                highlighters.mask.add(
                    cell.findView(paper),
                    cell.isLink() ? 'line' : 'body',
                    'selection',
                    { attrs: { stroke: state.user.color, strokeWidth: 3 }}
                );
            });

            if (!isLocal && state.editing) {
                const cell = graph.getCell(state.editing);
                if (cell) {
                    highlighters.mask.add(
                        cell.findView(paper),
                        cell.isLink() ? 'line' : 'body',
                        'editing',
                        { attrs: { stroke: state.user.color, strokeWidth: 3, strokeDasharray: '6 3' }}
                    );
                }
            }
        });

        for (const [name, user] of remoteUsers) {
            if (!activeNames.has(name)) {
                user.removeCursor();
                remoteUsers.delete(name);
            }
        }

        renderUserList(states, localUser);
    });
}

export function setCursorPosition(x: number, y: number) {
    provider.awareness.setLocalStateField('cursor', { x, y });
}

export function isRemotelySelected(cellId: dia.Cell.ID) {
    return Array.from(provider.awareness.getStates()).some(([, state]) => {
        if (state.user === localUser || !state.selection) return false;
        return state.selection.includes(cellId);
    });
}

export function setEditingCell(cellId: dia.Cell.ID | null) {
    provider.awareness.setLocalStateField('editing', cellId);
}

export function isEditingName() {
    return !!provider.awareness.getLocalState()?.editingName;
}

export function isInteractionBlocked(cellId: dia.Cell.ID) {
    return (
        isEditingName() ||
        isRemotelySelected(cellId) ||
        isRemotelyEditing(cellId) ||
        isConnectedToEditingLink(cellId)
    );
}

function isConnectedToEditingLink(cellId: dia.Cell.ID): boolean {
    for (const [, state] of provider.awareness.getStates()) {
        if (state.user?.name === localUser.name || !state.editing) continue;
        const editingCell = graph.getCell(state.editing);
        if (!editingCell?.isLink()) continue;
        const link = editingCell as dia.Link;
        if (link.getSourceCell()?.id === cellId || link.getTargetCell()?.id === cellId) return true;
    }
    return false;
}

export function isRemotelyEditing(cellId: dia.Cell.ID) {
    return Array.from(provider.awareness.getStates()).some(([, state]) => {
        if (state.user === localUser || !state.editing) return false;
        return state.editing === cellId;
    });
}
