import { logger } from "@atomist/automation-client";
import { LocalMachineConfig } from "../..";
import { argsToGitHookInvocation } from "../../setup/gitHooks";
import { suppressConsoleLogging } from "../cli/support/configureLogging";
import { setCommandLineLogging } from "../cli/support/consoleOutput";

suppressConsoleLogging();
setCommandLineLogging();

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */
export function runOnGitHook(argv: string[], config: LocalMachineConfig) {
    const invocation = argsToGitHookInvocation(argv);
    logger.info("Executing git hook against project %j", invocation);

    // return logExceptionsToConsole(() =>
    //         handleGitHookEvent(invocation, config),
    //     config.showErrorStacks,
    // );
}
