import React, { ChangeEvent, ReactElement, useContext, useEffect } from 'react';
import eventBusServiceContext from '../../../services/event-bus-service.context';
import { SharedEvents } from '../../../joint-plus/controller';

interface Props {
    id?: string;
    type?: string;
    placeholder?: string;
    spellCheck?: boolean;
    value?: string | number;
    defaultValue?: string | number;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

const BATCH_NAME = 'inspector-input';

const Input = (props: Props): ReactElement => {

    const eventBusService = useContext(eventBusServiceContext);

    const onFocus = (): void => {
        eventBusService.emit(SharedEvents.GRAPH_START_BATCH, BATCH_NAME);
    };

    const onBlur = (): void => {
        eventBusService.emit(SharedEvents.GRAPH_STOP_BATCH, BATCH_NAME);
    };

    useEffect(() => {
        return () => {
            onBlur();
        }
    }, []);

    return (
        <input id={props.id}
               type={props.type}
               placeholder={props.placeholder}
               spellCheck={('spellCheck' in props) ? props.spellCheck : true}
               value={props.value}
               defaultValue={props.defaultValue}
               onChange={props.onChange}
               onFocus={onFocus}
               onBlur={onBlur}
        />);
};

export default Input;
