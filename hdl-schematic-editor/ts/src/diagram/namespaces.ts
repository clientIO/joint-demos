import { shapes as defaultCellNamespace, util } from '@joint/plus';
import { systemModelNamespace } from '../system/diagram/namespaces';
import { Input, Output, Constant, Gate, Operator, Mux, Register, Split, Join, Block, Edge } from './models';

/**
 * Models for the application shapes
 */
export const applicationModelNamespace = {
    [Input.type]: Input,
    [Output.type]: Output,
    [Constant.type]: Constant,
    [Gate.type]: Gate,
    [Operator.type]: Operator,
    [Mux.type]: Mux,
    [Register.type]: Register,
    [Split.type]: Split,
    [Join.type]: Join,
    [Block.type]: Block,
};

/**
 * Add any system shape model overrides here if needed in the future
 */
export const systemModelOverrides = {
    [Edge.type]: Edge,
};

/**
 * JointJS resolves the dotted types (e.g. `hdl.Input`) as paths in the namespace,
 * so the application models are nested (e.g. `{ hdl: { Input } }`).
 */
const nestedApplicationModelNamespace = Object.entries(applicationModelNamespace).reduce((namespace, [type, model]) => {
    util.setByPath(namespace, type, model, '.');
    return namespace;
}, {} as Record<string, unknown>);

/**
 * Cell namespace to be used with JointJS graph and paper
 */
export const cellNamespace = {
    ...defaultCellNamespace, // JointJS default shapes
    ...systemModelNamespace, // System shapes like Placeholder, ButtonLink
    ...systemModelOverrides,
    ...nestedApplicationModelNamespace,
};
