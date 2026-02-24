import React, { useCallback, useState } from 'react';
import { useBaseInspector } from './useBaseInspector';
import Input from '../Input/Input';

import type { ChangeEvent, ReactElement } from 'react';
import type { dia } from '@joint/plus';

interface Props {
    cell: dia.Cell;
}

const cellProps = {
    label: ['attrs', 'label', 'text']
};

const LabelInspector = (props: Props): ReactElement => {

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

export default LabelInspector;
