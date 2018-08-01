/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { logger } from "@atomist/automation-client";
import { isAtomistTemporaryBranch } from "../../../sdm/binding/project/FileSystemProjectLoader";
import { infoMessage, logExceptionsToConsole } from "../command/support/consoleOutput";
import { suggestStartingAllMessagesListener } from "../command/support/suggestStartingAllMessagesListener";
import { argsToGitHookInvocation, handleGitHookEvent, } from "./handlePushBasedEventOnRepo";
import { AutomationClientFinder } from "../http/AutomationClientFinder";
import { SingleDefaultAutomationClientFinder } from "../http/support/SingleDefaultAutomationClientFinder";
import { PortRangeAutomationClientFinder } from "../http/support/PortRangeAutomationClientFinder";

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */
export async function runOnGitHook(argv: string[],
                                   clientFinder: AutomationClientFinder = new PortRangeAutomationClientFinder()
) {
    const invocation = argsToGitHookInvocation(argv);
    if (isAtomistTemporaryBranch(invocation.branch)) {
        logger.info("Ignoring Atomist temporary branch in '%j': Atomist will eventually surface these changes to let hook react",
            invocation);
        return;
    }

    const clients = await clientFinder.findAutomationClients();
    if (clients.length === 0) {
        throw new Error("No connected clients found");
    }
    const automationClientInfo = clients[0];

    await suggestStartingAllMessagesListener();
    if (!automationClientInfo.localConfig) {
        infoMessage("No Software Delivery Machine running; not delivering push event.\n");
        process.exit(0); // This is a lot faster than just returning. I don't want to make your commit slow.
    } else {
        logger.debug("Executing git hook against project %j", invocation);
        return logExceptionsToConsole(() =>
                handleGitHookEvent(automationClientInfo.connectionConfig,
                    automationClientInfo.localConfig, invocation),
            automationClientInfo.connectionConfig.showErrorStacks,
        );
    }
}