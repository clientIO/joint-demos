/**
 * @file Definitions for action and trigger providers and their registries
 */

export interface DataEntry {
    name: string;
    type: string;
    description: string;
}

export interface Data {
    [key: string]: DataEntry;
}

export interface ActionDefinition {
    id: string;
    name: string;
    description: string;
    data?: Data;
}

export interface TriggerDefinition {
    id: string;
    name: string;
    description: string;
}

export interface ProviderDefinition {
    name: string;
    icon: string;
}

export interface ActionProviderDefinition extends ProviderDefinition {
    actions: ActionDefinition[];
}

export interface TriggerProviderDefinition extends ProviderDefinition {
    triggers: TriggerDefinition[]
}

export type ActionProviderRegistry = {
    [providerId: string]: ActionProviderDefinition
};

export type TriggerProviderRegistry = {
    [providerId: string]: TriggerProviderDefinition
};

export type ControlRegistry = {
    [controlId: string]: ControlDefinition
};

export type PortDefinition = {
    id: string;
    label?: string;
};

export interface ControlDefinition {
    name: string;
    icon: string;
    inboundPorts: PortDefinition[];
    outboundPorts: PortDefinition[];
    description: string;
    data?: Data;
};
