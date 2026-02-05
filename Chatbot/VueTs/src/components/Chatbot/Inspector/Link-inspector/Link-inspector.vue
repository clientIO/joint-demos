<template>
    <div>
        <h1>Link</h1>

        <label>Label
            <input type="text"
                   placeholder="Enter label"
                   v-batch
                   v-model="label"
                   @input="changeCellProp(props.label, label)">
        </label>
    </div>
</template>

<script lang="ts">
    import Component from 'vue-class-component';
    import { BaseInspector } from '../Base-inspector/base-inspector';

    @Component({})
    export default class LinkInspector extends BaseInspector {

        public label: string = '';

        public props = {
            label: ['labels', 0, 'attrs', 'labelText', 'text']
        }

        protected assignFormFields(): void {
            const { cell, props } = this;
            this.label = cell.prop(props.label);
        }
    }
</script>
