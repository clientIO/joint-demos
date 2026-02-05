/**
 * @file Definitions for action and trigger providers and their registries
 */

export interface ActionDataEntry {
    name: string;
    type: string;
    description: string;
}

export interface ActionData {
    [key: string]: ActionDataEntry;
}

export interface ActionDefinition {
    id: string;
    name: string;
    description: string;
    data?: ActionData;
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
