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

import { determineDefaultRepositoryOwnerParentDirectory } from "../../../sdm/configuration/defaultLocalSoftwareDeliveryMachineConfiguration";
import { infoMessage, logExceptionsToConsole, } from "../../ui/consoleOutput";
import { YargBuilder } from "./support/yargBuilder";
import { startWatching } from "./support/scm-feed/watcher";
import { GitHubActivityFeedEventReader } from "./support/scm-feed/GitHubActivityFeedEventReader";
import { ScmFeedCriteria } from "./support/scm-feed/FeedEvent";

/**
 * Watch the given GitHub org, updating any projects we have cloned.
 * This will fire events to any running SDMs.
 * @param {YargBuilder} yargs
 */
export function addWatchGitHubCommand(yargs: YargBuilder) {
    // TODO parse out name
    yargs.command({
        command: "watch github <args>",
        describe: "Watch the given GitHub org " +
        `under the Atomist root at ${determineDefaultRepositoryOwnerParentDirectory()}`,
        builder: a => {
            a.option("seconds", {
                type: "number",
                default: 30,
                description: "Seconds to wait between polling",
                required: false,
            }).option("owner", {
                type: "string",
                required: true,
                description: "GitHub org to pass",
            }).option("user", {
                type: "boolean",
                required: false,
                default: false,
                description: "Is this owner a user rather than an org?",
            }).option("apiBase", {
                type: "string",
                required: false,
                default: undefined,
                description: "API base. Defaults to github.com. Specify for GitHub enterprise",
            });
            return a;
        },
        handler: args => {
            // TODO set this
            const token: string = null;
            infoMessage("Starting polling GitHub owner %s every %d seconds...", args.owner, args.seconds);
            infoMessage("Terminate process to stop polling. An SDM must be running");
            const criteria: ScmFeedCriteria = {
                owner: args.owner,
                user: args.user === true,
                token,
                apiBase: args.apiBase,
            };
            const feedEventReader = new GitHubActivityFeedEventReader(criteria);
            return logExceptionsToConsole(async () => {
                await startWatching( criteria, {
                    repositoryOwnerParentDirectory: determineDefaultRepositoryOwnerParentDirectory(),
                    intervalSeconds: args.seconds,
                    feedEventReader,
                });
            }, true);
        },
    });
}

