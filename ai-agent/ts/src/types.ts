import type { ui } from '@joint/plus';
// Registry
import type { TriggerProviderRegistry, ActionProviderRegistry } from './registry/types';

/**
 * Application configuration
 */
export interface AppConfig {
    triggers: TriggerProviderRegistry;
    actions: ActionProviderRegistry;
}

/**
 * Interface for configuring the node's inspector UI.
 */
export interface InspectorConfig extends ui.Inspector.Options {
    headerText?: string;
    headerIcon?: string;
}
