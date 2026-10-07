import type { YosysJSON } from './yosys/types';

/**
 * Application configuration
 */
export interface AppConfig {
    /**
     * The example netlist loaded with the "Load example" button.
     */
    example: YosysJSON;
}
