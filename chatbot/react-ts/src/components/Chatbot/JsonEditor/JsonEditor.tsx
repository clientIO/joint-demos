import React, { ReactElement, useContext, useEffect, useState } from 'react';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import './JsonEditor.scss';
import eventBusServiceContext from '../../../services/event-bus-service.context';
import { SharedEvents } from '../../../joint-plus/controller';

interface Props {
    content: Object;
}

const DEBOUNCE_TIME_MS = 500;

const JsonEditor = (props: Props): ReactElement => {

    const [placeholder] = useState('e.g. { "cells": [{ "type": "app.Message"}] }');
    const [content, setContent] = useState<string | Object>(null);
    const [contentSubject] = useState(new Subject<Object>());
    const eventBusService = useContext(eventBusServiceContext);

    useEffect(() => {
        contentSubject.pipe(debounceTime(DEBOUNCE_TIME_MS)).subscribe((json: Object) => {
            eventBusService.emit(SharedEvents.JSON_EDITOR_CHANGED, json);
        });
    }, [contentSubject, eventBusService]);

    useEffect(() => {
        if (props.content) {
            setContent(props.content);
        }
    }, [props.content]);

    const parseJSON = (jsonString: string): void => {
        setContent(jsonString);
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
    };

    const formatJSON = (json: string | Object): string => {
        if (!json) {
            return '';
        }
        return typeof json === 'string' ? json : JSON.stringify(json, null, 2);
    };

    return (
        <div className="chatbot-json-editor">
            <textarea placeholder={placeholder}
                      spellCheck="false"
                      value={formatJSON(content)}
                      onChange={(e) => parseJSON(e.target.value)}
            />
        </div>
    );
};

export default JsonEditor;
