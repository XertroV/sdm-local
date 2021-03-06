/*
 * Copyright © 2019 Atomist, Inc.
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

import { CommandHandlerMetadata } from "@atomist/automation-client/lib/metadata/automationMetadata";
import { convertToDisplayable } from "./runCommandOnColocatedAutomationClient";
import {
    CommandLineParameter,
    YargBuilder,
} from "./yargBuilder";

/**
 * Expose the parameters for this command
 * @param {CommandHandlerMetadata} hi
 * @param {yargs.Argv} args
 * @param allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
export function exposeParameters(hi: CommandHandlerMetadata, args: YargBuilder, allowUserInput: boolean): YargBuilder {
    commandLineParametersFromCommandHandlerMetadata(hi, allowUserInput)
        .forEach(p => {
            args.withParameter(p);
        });
    return args;
}

export function commandLineParametersFromCommandHandlerMetadata(hi: CommandHandlerMetadata,
                                                                allowUserInput: boolean): CommandLineParameter[] {
    const p1 = hi.parameters
        .map((p: any) => {
            const nameToUse = convertToDisplayable(p.name);
            return {
                parameterName: nameToUse,
                required: !allowUserInput && p.required && !p.default_value,
            };
        });
    const p2 = (hi.mapped_parameters || []).map((mp: any) => {
        const nameToUse = convertToDisplayable(mp.name);
        return {
            parameterName: nameToUse,
            required: false, // we might be able to populate these, even when required
        };
    });
    return [...p1, ...p2];
}
