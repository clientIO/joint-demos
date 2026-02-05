import React, { ChangeEvent, ReactElement, useCallback, useState } from 'react';
import { shapes } from '@joint/plus';

import { useBaseInspector } from './useBaseInspector';
import Input from '../Input/Input';

interface Props {
    cell: shapes.app.Link;
}

const cellProps = {
    label: ['labels', 0, 'attrs', 'labelText', 'text']
};

const LinkInspector = (props: Props): ReactElement => {

    const { cell } = props;

    const [label, setLabel] = useState<string>('');

    const assignFormFields = useCallback((): void => {
        setLabel(cell.prop(cellProps.label));
    }, [cell]);

    const changeCellProp = useBaseInspector({ cell, assignFormFields });

    return (
        <>
            <h1>Component</h1>

            <label htmlFor="label">Label</label>
            <Input id="label"
                   type="text"
                   placeholder="Enter label"
                   value={label}
                   onChange={(e: ChangeEvent<HTMLInputElement>) => changeCellProp(cellProps.label, e.target.value)}
            />
        </>
    );
};

export default LinkInspector;
