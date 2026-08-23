import * as Dialog from '@radix-ui/react-dialog';
import { X, Download } from 'lucide-react';
import './export-dialog.css';

interface ExportDialogProps {
    dataUrl: string;
    onClose: () => void;
}

/**
 * Preview dialog for the exported PNG with a download action.
 */
export function ExportDialog({ dataUrl, onClose }: ExportDialogProps) {
    return (
        <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="export-dialog-backdrop" />
                <Dialog.Content className="export-dialog" aria-describedby={undefined}>
                    <div className="export-dialog-header">
                        <Dialog.Title asChild>
                            <h2>Download PNG</h2>
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button type="button" className="export-dialog-close" aria-label="Close">
                                <X size={16} />
                            </button>
                        </Dialog.Close>
                    </div>
                    <div className="export-dialog-body">
                        <img src={dataUrl} alt="Exported diagram" />
                    </div>
                    <div className="export-dialog-footer">
                        <a className="export-dialog-download" href={dataUrl} download="bpmn-diagram.png">
                            <Download size={15} />
                            Download
                        </a>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
