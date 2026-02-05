<template>
    <div class="json-editor-container">
        <textarea :placeholder="placeholder" spellcheck="false" :value="content | json"
                  @input="parseJSON($event.target.value)"></textarea>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import Component from 'vue-class-component';
    import { Subject } from 'rxjs';
    import { debounceTime } from 'rxjs/operators';

    import { SharedEvents } from '../../../joint-plus/controller';
    import { Prop } from 'vue-property-decorator';

    const DEBOUNCE_TIME_MS = 500;

    @Component({
        filters: {
            json: function (json: object): string {
                return JSON.stringify(json, null, 2);
            }
        }
    })
    export default class JsonEditor extends Vue {
        @Prop() content: Object;
        public placeholder = 'e.g. { "cells": [{ "type": "app.Message"}] }';
        public contentSubject = new Subject<Object>();

        public mounted(): void {
            const { contentSubject, $eventBusService } = this;
            contentSubject.pipe(debounceTime(DEBOUNCE_TIME_MS)).subscribe((json: Object) => {
                $eventBusService.emit(SharedEvents.JSON_EDITOR_CHANGED, json);
            });
        }

        public parseJSON(jsonString: string): void {
            const { contentSubject } = this;
            let json;
            if (!jsonString) {
                json = { cells: [] };
            } else {
                try {
                    json = JSON.parse(jsonString);
                } catch (e) {
                    // Invalid JSON
                    return;
                }
            }
            contentSubject.next(json);
        }
    }
</script>

<style lang="scss" scoped>
    .json-editor-container {
        border-top: 1px solid #D4D4D4;
        height: 200px;
        box-sizing: border-box;
        background: #F5F5F5;

        textarea {
            height: 100%;
            width: 100%;
            background: #F5F5F5;
            border: none;
            resize: none;
            color: #212121;
            font-family: realist, sans-serif;
            font-size: 13px;
            line-height: 15px;
            padding: 16px;
            outline: none;
        }
    }
</style>
