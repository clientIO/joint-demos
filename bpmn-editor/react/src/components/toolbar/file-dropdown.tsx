import { useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { usePaperScroller, useGraphHistory } from '@joint/react-plus';
import { FileText, ChevronDown } from 'lucide-react';
import { importFile } from '../../actions/import-actions';
import { Tip } from '../tooltip/tooltip';

import type { ChangeEvent } from 'react';

export function FileDropdown() {

    const jsonInputRef = useRef<HTMLInputElement | null>(null);
    const xmlInputRef = useRef<HTMLInputElement | null>(null);

    const { paperScroller } = usePaperScroller();
    const { commandManager } = useGraphHistory();

    // The file inputs pre-filter the extensions via their `accept` attributes.
    const onFileChange = async(evt: ChangeEvent<HTMLInputElement>) => {
        const file = evt.target.files?.[0];
        evt.target.value = '';
        if (!file || !paperScroller) return;
        await importFile(paperScroller, commandManager, file);
    };

    return (
        <div className="file-dropdown-container">
            <DropdownMenu.Root>
                <Tip label="Open file" side="bottom">
                    <DropdownMenu.Trigger asChild>
                        <button type="button" className="toolbar-button toolbar-open-file-button">
                            <FileText size={18} />
                            <ChevronDown size={14} />
                        </button>
                    </DropdownMenu.Trigger>
                </Tip>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className="file-dropdown-menu" align="start" sideOffset={4}>
                        <DropdownMenu.Item
                            className="file-dropdown-item"
                            onSelect={() => jsonInputRef.current?.click()}
                        >
                            Load JSON
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            className="file-dropdown-item"
                            onSelect={() => xmlInputRef.current?.click()}
                        >
                            Load XML
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <input ref={jsonInputRef} type="file" accept=".json" hidden onChange={onFileChange} />
            <input ref={xmlInputRef} type="file" accept=".bpmn, .xml" hidden onChange={onFileChange} />
        </div>
    );
}
