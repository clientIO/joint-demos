<template>
    <div>
        <h1>Component</h1>

        <label>Label
            <input placeholder="Enter label"
                   v-batch
                   v-model="label"
                   @input="changeCellProp(props.label, label)">
        </label>

        <label>Description
            <input type="text"
                   placeholder="Enter description"
                   v-batch
                   v-model="description"
                   @input="changeCellProp(props.description, description)">
        </label>

        <label>Icon (Base64)
            <span class="icon-input-logo"></span>
            <input type="text"
                   class="icon-input"
                   placeholder="Enter icon"
                   spellcheck="false"
                   v-batch
                   v-model="icon"
                   @input="changeCellProp(props.icon, icon)">
        </label>

        <div class="ports">
            <div class="out-ports-bar">
                <span>Out Ports</span>
                <button :disabled="!canAddPort"
                        @click="addCellPort()"
                        class="add-port"
                        data-tooltip="Add Output Port">
                </button>
            </div>
            <div class="port" v-for="port in ports" :key="port.id">
                <input placeholder="Label"
                       v-batch
                       v-model="port.label"
                       @input="changeCellPort(port)"/>
                <div class="remove-port"
                     @click="removeCellPort(port.id)"
                     data-tooltip="Remove Output Port"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import Component from 'vue-class-component';
    import { Prop } from 'vue-property-decorator';
    import { shapes } from '@joint/plus';

    import { BaseInspector } from '../Base-inspector/base-inspector';
    interface InspectorPort {
        id: string;
        label: string;
    }
    @Component({})
    export default class MessageInspector extends BaseInspector {
        @Prop() cell: shapes.app.Message;
        public label = '';
        public description = '';
        public icon = '';
        public ports = [] as InspectorPort[];
        public canAddPort = false;
        public props = {
            label: ['attrs', 'label', 'text'],
            description: ['attrs', 'description', 'text'],
            icon: ['attrs', 'icon', 'xlinkHref'],
            portLabel: ['attrs', 'portLabel', 'text']
        }
        public addCellPort(): void {
            this.cell.addDefaultPort();
            this.assignFormPorts();
        }
        public removeCellPort(portId: string): void {
            this.cell.removePort(portId);
            this.assignFormPorts();
        }
        public changeCellPort(port: InspectorPort): void {
            const { cell, props } = this;
            cell.portProp(port.id, props.portLabel, port.label);
        }
        protected assignFormFields(): void {
            const { cell, props } = this;
            this.label = cell.prop(props.label);
            this.description = cell.prop(props.description);
            this.icon = cell.prop(props.icon);
            this.assignFormPorts();
        }
        private assignFormPorts(): void {
            const { cell, props } = this;
            this.canAddPort = cell.canAddPort('out');
            this.ports = cell.getGroupPorts('out').map(({ id }) => {
                return {
                    id,
                    label: cell.portProp(id, props.portLabel)
                }
            });
        }
    }
</script>
