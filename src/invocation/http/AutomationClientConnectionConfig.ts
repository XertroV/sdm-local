import { ProjectOperationCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";

/**
 * How to connect to an automation client
 */
export interface AutomationClientConnectionConfig {

    atomistTeamId: string;

    atomistTeamName: string;

    /**
     * Base endpoint, including port
     */
    baseEndpoint: string;

    user?: string;

    password?: string;

    credentials?: ProjectOperationCredentials;

    /**
     * Whether to display error stacks to console
     */
    showErrorStacks?: boolean;

}
