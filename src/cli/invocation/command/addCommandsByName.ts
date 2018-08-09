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

import { Argv } from "yargs";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { logExceptionsToConsole } from "../../ui/consoleOutput";
import { ShowDescriptionListener } from "./support/commandInvocationListeners";
import { exposeParameters } from "./support/exposeParameters";
import { runCommandOnCollocatedAutomationClient } from "./support/runCommandOnCollocatedAutomationClient";

/**
 * Add commands by name from the given client
 * @param {yargs.Argv} yargs
 * @param {boolean} allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
export function addCommandsByName(ai: AutomationClientInfo,
                                  yargs: Argv,
                                  allowUserInput: boolean = true) {
    yargs.command("run", "Run a command",
        args => {
            ai.client.commands.forEach(hi => {
                args.command({
                    command: hi.name,
                    handler: async argv => {
                        return logExceptionsToConsole(
                            () => runByCommandName(ai, hi.name, argv), ai.connectionConfig.showErrorStacks);
                    },
                    builder: argv => exposeParameters(hi, argv, allowUserInput),
                });
            });
            return args;
        });
}

async function runByCommandName(ai: AutomationClientInfo,
                                name: string,
                                command: any): Promise<any> {
    const hm = ai.client.commands.find(h => h.name === name);
    if (!hm) {
        process.stdout.write(`No command with name [${name}]: Known command names are \n${ai.client.commands
            .map(m => "\t" + m.name).sort().join("\n")}`);
        process.exit(1);
    }
    return runCommandOnCollocatedAutomationClient(
        ai.connectionConfig,
        ai.localConfig.repositoryOwnerParentDirectory,
        {
            atomistTeamName: ai.connectionConfig.atomistTeamName,
            atomistTeamId: ai.connectionConfig.atomistTeamId,
        },
        hm, command, [ShowDescriptionListener]);
}