import { Stencil, useSelectionCollection } from '@joint/react-plus';
import { BpmnPalette } from './bpmn-palette';
import './bpmn-stencil.css';
import {
    onStencilElementDragStart,
    onStencilElementDrag,
    onStencilElementDragEnd,
    dropStencilElement
} from '../../dnd/stencil';

/**
 * The shape palette with the drag-and-drop pipeline (pool/swimlane previews,
 * boundary-event snapping, selecting the dropped element).
 */
export function BpmnStencil() {

    const { collection: selectionCollection } = useSelectionCollection();

    return (
        // display:contents — a landmark for the palette without adding a flex
        // child to the .app-body layout (the Stencil stays the flex item).
        <aside aria-label="Shape palette" style={{ display: 'contents' }}>
            <Stencil
                className="stencil-container"
                onCellDragStart={(params) => {
                    // Clear the selection before the drag interaction starts
                    selectionCollection.reset([]);
                    onStencilElementDragStart(params);
                }}
                onCellDrag={onStencilElementDrag}
                onCellDragEnd={onStencilElementDragEnd}
                onCellDrop={(params) => {
                    // Select the dropped element (the drop may have replaced it)
                    const selectedModel = dropStencilElement(params);
                    if (selectedModel) {
                        selectionCollection.reset([selectedModel]);
                    }
                }}
            >
                <BpmnPalette />
            </Stencil>
        </aside>
    );
}
