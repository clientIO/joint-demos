<template>
    <div class="inspector-container" :class="{'disabled-container': !selectedCellId}">
        <div v-if="selectedCellId">
            <MessageInspector 
                :cell="cell" 
                :currentCellId="selectedCellId"
                v-if="selectedCellType === shapeTypesEnum.MESSAGE"
            />
            <LinkInspector 
                :cell="cell"
                :currentCellId="selectedCellId"
                v-else-if="selectedCellType === shapeTypesEnum.LINK"
            />
            <LabelInspector 
                :cell="cell" 
                :currentCellId="selectedCellId"
                v-else-if="selectedCellType === shapeTypesEnum.FLOWCHART_START"
            />
            <LabelInspector 
                :cell="cell" 
                :currentCellId="selectedCellId"
                v-else-if="selectedCellType === shapeTypesEnum.FLOWCHART_END"
            />
        </div>
        <div v-else>
            <h1>Component</h1>
            <label>Label
                <input disabled/>
            </label>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import Component from 'vue-class-component';
    import { Subscription } from 'rxjs';
    import { dia } from '@joint/plus';
    import MessageInspector from './Message-inspector/Message-inspector.vue';
    import LabelInspector from './Label-inspector/Label-inspector.vue';
    import LinkInspector from './Link-inspector/Link-inspector.vue';
    import { SharedEvents } from '../../../joint-plus/controller';
    import { ShapeTypesEnum } from '../../../joint-plus/shapes/app.shapes';
    @Component({
        components: {
            MessageInspector,
            LinkInspector,
            LabelInspector
        }
    })
    export default class Inspector extends Vue {

        // Reactive trigger
        public selectedCellId: dia.Cell.ID = '';
        public selectedCellType: ShapeTypesEnum | null = null;

        // Non-reactive storage
        public cell: dia.Cell | null;
        public subscriptions = new Subscription();
        public shapeTypesEnum = ShapeTypesEnum;

        public created(): void {
            this.cell = null;
        }

        public mounted(): void {
            this.subscriptions.add(
                this.$eventBusService.subscribe(SharedEvents.SELECTION_CHANGED, (selection: dia.Cell[]) => this.setCell(selection))
            );
        }
        public beforeDestroy(): void {
            this.subscriptions.unsubscribe();
        }
        private setCell(selection: dia.Cell[]): void {
            const [cell = null] = selection;
            this.cell = cell;
            this.selectedCellId = cell ? cell.id : '';
            this.selectedCellType = cell ? cell.get('type') as ShapeTypesEnum : null;
        }
    }
</script>

<style lang="scss">
    @import "src/assets/fonts";

    .inspector-container {
        height: 100%;
        top: 0;
        box-sizing: border-box;
        right: 0;
        width: 348px;
        padding: 16px;
        overflow: auto;
        border-left: 1px solid #D4D4D4;
        background: #FCFCFC;
    }

    h1 {
        text-align: left;
        font-family: realist, sans-serif;
        font-size: 16px;
        line-height: 19px;
        margin: 0 0 16px 0;
        letter-spacing: 0;
        color: #191919;
        opacity: 1;
    }

    label {
        text-align: left;
        font-family: realist, sans-serif;
        font-size: 13px;
        line-height: 16px;
        letter-spacing: 0;
        color: #3A3A3A;
    }

    input {
        box-sizing: border-box;
        width: 100%;
        padding: 8px;
        text-overflow: ellipsis;
        outline: none;
        height: 35px;
        background: #FFFFFF;
        border: 1px solid #D4D4D4;
        opacity: 1;
        text-align: left;
        font-family: realist, sans-serif;
        letter-spacing: 0;
        color: #191919;
        margin-bottom: 16px;
        margin-top: 3px;

        &::placeholder {
            color: #6C6C6C;
        }
    }

    .icon-input-logo {
        position: absolute;
        margin-top: 12px;
        margin-left: 8px;
        display: block;

        &:after {
            content: '\E85D';
            @include icon;
            color: #191919;
            font-weight: 700;
            font-size: 18px;
        }
    }

    .icon-input {
        padding-left: 31px;
    }

    .disabled-container {
        h1, label, input {
            opacity: 0.6;
        }
    }

    .ports {
        margin-top: 10px;

        .out-ports-bar {
            width: 100%;
            height: 47px;
            margin: 0 -16px;
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #F5F5F5;
            border-bottom: 1px solid #D4D4D4;
            border-top: 1px solid #D4D4D4;
            box-sizing: content-box;

            span {
                text-align: left;
                font-family: realist, sans-serif;
                font-size: 14px;
                line-height: 17px;
                letter-spacing: 0;
                color: #3A3A3A;
            }
        }

        .add-port {
            height: 23px;
            width: 23px;
            border-radius: 50%;
            background: #0057FF;
            display: flex;
            justify-content: center;
            align-items: center;
            border: none;
            cursor: pointer;
            margin-right: 8px;
            outline: none;

            &:before {
                content: '\E145';
                @include icon;
                font-size: 18px;
                color: #FFFFFF;
                font-weight: 700;
            }

            &:hover {
                background: #0057FFBF;
            }

            &[disabled] {
                background: #BEBEBE;
                cursor: not-allowed;
            }
        }

        .add-ports {
            display: flex;
            width: 100%;
            justify-content: space-between;
            margin-top: 5px;
        }

        .port {
            margin-top: 8px;
            position: relative;
            margin-bottom: 16px;

            input {
                margin: auto;
                border-radius: 30px;
            }

            .remove-port {
                cursor: pointer;
                width: 23px;
                height: 23px;
                background: #727272;
                border-radius: 50%;
                position: absolute;
                top: 0;
                bottom: 0;
                right: 8px;
                margin: auto;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                outline: none;

                &:before {
                    content: "\E5CD";
                    @include icon;
                    font-size: 14px;
                    color: #FFFFFF;
                    font-weight: 800;
                }
            }

            &:last-of-type {
                margin-bottom: 0;
            }
        }
    }
</style>
