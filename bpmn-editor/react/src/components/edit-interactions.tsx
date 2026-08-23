import { useEditInteractions } from '../hooks/use-edit-interactions';
import { BpmnHalo } from './bpmn-halo/bpmn-halo';
import { BpmnFreeTransform } from './bpmn-free-transform';
import { BpmnSnaplines } from './bpmn-snaplines';
import { LinkTools } from './link-tools';
import { LinkContextMenu } from './link-context-menu/link-context-menu';

// Everything that makes the diagram editable: the editing gestures (inline
// label editor, element drag routing, link replacement) and the editing UI
// (halo, resize handles, link tools). Unmount it for a read-only diagram.
export function EditInteractions() {

    useEditInteractions();

    return (
        <>
            <BpmnSnaplines />
            <BpmnHalo />
            <BpmnFreeTransform />
            <LinkTools />
            <LinkContextMenu />
        </>
    );
}
