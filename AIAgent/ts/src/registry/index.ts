/**
 * @file Methods for working with action and trigger provider registries
 */
import type { ActionDefinition, ActionProviderDefinition, ActionProviderRegistry, TriggerDefinition, TriggerProviderDefinition, TriggerProviderRegistry } from './types';

/**
 * Resolve the action provider and action definition for a given action key.
 */
export function resolveActionProvider(registry: ActionProviderRegistry, actionKey: string | null): [ActionProviderDefinition, ActionDefinition] | null {
    if (typeof actionKey !== 'string') return null;
    const [providerId, actionId] = parseRegistryKey(actionKey);
    const provider = registry[providerId];
    if (!provider) return null;
    const action = provider.actions.find((action) => action.id === actionId);
    if (!action) return null;
    return [provider, action];
}

/**
 * Resolve the trigger provider and trigger definition for a given trigger key.
 */
export function resolveTriggerProvider(registry: TriggerProviderRegistry, triggerKey: string | null): [TriggerProviderDefinition, TriggerDefinition] | null {
    if (typeof triggerKey !== 'string') return null;
    const [providerId, triggerId] = parseRegistryKey(triggerKey);
    const provider = registry[providerId];
    if (!provider) return null;
    const trigger = provider.triggers.find((trigger) => trigger.id === triggerId);
    if (!trigger) return null;
    return [provider, trigger];
}

const REGISTRY_KEY_SEPARATOR = '-';

/**
 * Create a registry key for an action / trigger given its provider ID and action/trigger ID.
 */
export function createRegistryKey(providerId: string, actionId: string): string {
    return `${providerId}${REGISTRY_KEY_SEPARATOR}${actionId}`;
}

/**
 * Parse a registry key into its provider ID and action/trigger ID components.
 */
export function parseRegistryKey(key: string): [string, string] {
    const [providerId, itemId] = key.split(REGISTRY_KEY_SEPARATOR);
    if (!providerId || !itemId) {
        throw new Error(`Invalid registry key: ${key}`);
    }
    return [providerId, itemId];
}
