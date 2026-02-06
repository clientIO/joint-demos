import type { ui } from '@joint/plus';
// Registry
import type { TriggerProviderRegistry, ActionProviderRegistry, ControlRegistry } from './registry/types';

/**
 * Application configuration
 */
export interface AppConfig {
    triggers: TriggerProviderRegistry;
    actions: ActionProviderRegistry;
    controls: ControlRegistry;
}

/**
 * Interface for configuring the node's inspector UI.
 */
export interface InspectorConfig extends ui.Inspector.Options {
    headerText?: string;
    headerIcon?: string;
}
