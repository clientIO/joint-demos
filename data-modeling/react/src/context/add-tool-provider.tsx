import { useMemo, useState, type ReactNode } from 'react';
import { AddToolContext, type AddTool, type AddToolApi } from './add-tool-context';

export function AddToolProvider({ children }: { readonly children: ReactNode }) {
    const [armed, setArmed] = useState<AddTool | null>(null);
    const value = useMemo<AddToolApi>(
        () => ({ armed, arm: (tool: AddTool) => setArmed(tool), disarm: () => setArmed(null) }),
        [armed],
    );
    return <AddToolContext.Provider value={value}>{children}</AddToolContext.Provider>;
}
