
/**
 * Resolve the action provider and action definition for a given action key.
 */
export function resolveActionProvider(registry, actionKey) {
    if (typeof actionKey !== 'string')
        return null;
    const [providerId, actionId] = parseRegistryKey(actionKey);
    const provider = registry[providerId];
    if (!provider)
        return null;
    const action = provider.actions.find((action) => action.id === actionId);
    if (!action)
        return null;
    return [provider, action];
}

/**
 * Resolve the trigger provider and trigger definition for a given trigger key.
 */
export function resolveTriggerProvider(registry, triggerKey) {
    if (typeof triggerKey !== 'string')
        return null;
    const [providerId, triggerId] = parseRegistryKey(triggerKey);
    const provider = registry[providerId];
    if (!provider)
        return null;
    const trigger = provider.triggers.find((trigger) => trigger.id === triggerId);
    if (!trigger)
        return null;
    return [provider, trigger];
}

/**
 * Resolve the control definition for a given control key.
 */
export function resolveControlType(registry, controlKey) {
    if (typeof controlKey !== 'string')
        return null;
    const control = registry[controlKey];
    if (!control)
        return null;
    return control;
}

const REGISTRY_KEY_SEPARATOR = '-';

/**
 * Create a registry key for an action / trigger given its provider ID and action/trigger ID.
 */
export function createRegistryKey(providerId, actionId) {
    return `${providerId}${REGISTRY_KEY_SEPARATOR}${actionId}`;
}

/**
 * Parse a registry key into its provider ID and action/trigger ID components.
 */
export function parseRegistryKey(key) {
    const [providerId, itemId] = key.split(REGISTRY_KEY_SEPARATOR);
    if (!providerId || !itemId) {
        throw new Error(`Invalid registry key: ${key}`);
    }
    return [providerId, itemId];
}
