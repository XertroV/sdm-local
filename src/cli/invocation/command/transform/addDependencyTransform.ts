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

import { CodeTransformRegistration } from "@atomist/sdm";
import { localCommandsCodeTransform } from "@atomist/sdm/api-helper/command/transform/localCommandsCodeTransform";
import { asSpawnCommand } from "@atomist/automation-client/util/spawned";

export interface ModuleId {
    name?: string;
    version: string;
}

/**
 * Transform to add a module to a project. Uses npm install.
 */
export function addDependencyTransform(name?: string): Partial<CodeTransformRegistration<ModuleId>> {
    return {
        parameters: {
            name: {
                required: !name,
                description: "module name",
            },
            version: {
                required: false,
                description: "npm version qualification. Goes after module name, e.g. @branch-master",
                defaultValue: "",
            },
        },
        transform: async (p, cli) => {
            const command = asSpawnCommand(`npm i ${cli.parameters.name || name}${cli.parameters.version}`);
            return localCommandsCodeTransform([command])(p, cli);
        },
    };
}