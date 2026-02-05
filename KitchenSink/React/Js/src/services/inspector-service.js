import * as joint from '@joint/plus';
import { inspectorDefinitions } from '../config/inspector';
const HIDDEN_CLASS_NAME = 'hidden';
export class InspectorService {
    constructor({ openGroupsButton, closeGroupsButton, container, header, content }) {
        openGroupsButton.addEventListener('click', () => { var _a; return (_a = this.inspector) === null || _a === void 0 ? void 0 : _a.openGroups(); });
        closeGroupsButton.addEventListener('click', () => { var _a; return (_a = this.inspector) === null || _a === void 0 ? void 0 : _a.closeGroups(); });
        this.header = header;
        this.content = content;
        this.container = container;
    }
    create(cell) {
        this.header.classList.remove(HIDDEN_CLASS_NAME);
        const { groups, inputs } = this.getInspectorConfig()[cell.get('type')];
        const inspector = joint.ui.Inspector.create(this.content, {
            cell,
            groups,
            inputs,
            container: this.container,
            renderFieldContent: (options, path, _value, inspector) => {
                if (options.type === 'image-picker') {
                    const label = document.createElement('label');
                    label.textContent = options.label;
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/x-png,image/gif,image/jpeg';
                    const field = document.createElement('div');
                    field.appendChild(label);
                    field.appendChild(input);
                    input.addEventListener('change', function () {
                        inspector.updateCell(field, path, options);
                    });
                    return field;
                }
                // Use the default field renderer.
                return null;
            },
            getFieldValue: (field, type) => {
                if (type === 'image-picker') {
                    const file = field.querySelector('input').files.item(0);
                    return { value: file ? URL.createObjectURL(file) : '' };
                }
                // Use the default field value getter.
                return null;
            }
        });
        if (this.inspector !== inspector) {
            inspector.on('close', () => {
                this.header.classList.add(HIDDEN_CLASS_NAME);
            });
            this.inspector = inspector;
        }
        return this.inspector;
    }
    getInspectorConfig() {
        return inspectorDefinitions;
    }
}
