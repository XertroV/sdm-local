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

import { LocalProject } from "@atomist/automation-client/project/local/LocalProject";
import { NodeFsLocalProject } from "@atomist/automation-client/project/local/NodeFsLocalProject";
import chalk from "chalk";
import * as fs from "fs";
import { sprintf } from "sprintf-js";
import { HookEvent } from "../invocation/git/handleGitHookEvent";
import { errorMessage, infoMessage, warningMessage } from "../ui/consoleOutput";

/**
 * Add Git hooks to the given repo
 * @param {string} projectBaseDir
 * @return {Promise<void>}
 */
export async function addGitHooks(projectBaseDir: string) {
    if (fs.existsSync(`${projectBaseDir}/.git`)) {
        const p = await NodeFsLocalProject.fromExistingDirectory(undefined, projectBaseDir);
        return addGitHooksToProject(p);
    } else {
        infoMessage(
            chalk.gray(sprintf("Ignoring directory at %s as it is not a git project\n"),
                projectBaseDir));
    }
}

export async function addGitHooksToProject(p: LocalProject) {
    for (const event of Object.values(HookEvent)) {
        const atomistContent = scriptFragments()[event];
        if (!atomistContent) {
            errorMessage("Unable to create git script content for event '%s'", event);
            process.exit(1);
        }
        await reatomizeScript(p, `.git/hooks/${event}`, markAsAtomistContent(atomistContent));
        await p.makeExecutable(`.git/hooks/${event}`);
        infoMessage(chalk.gray(sprintf(
            `Adding git %s script to project at %s\n`,
            event,
            p.baseDir)));
    }
}

export async function removeGitHooks(baseDir: string) {
    if (fs.existsSync(`${baseDir}/.git`)) {
        const p = await NodeFsLocalProject.fromExistingDirectory({ owner: "doesn't", repo: "matter" }, baseDir);
        for (const hookFile of Object.values(HookEvent)) {
            await deatomizeScript(p, `/.git/hooks/${hookFile}`);
        }
    } else {
        infoMessage(chalk.gray(sprintf(
            "Ignoring directory at %s as it is not a git project",
            baseDir)));
    }
}

/**
 * Update the Atomist script element if found
 * @param {LocalProject} p
 * @param {string} scriptPath
 * @return {Promise<void>}
 */
async function reatomizeScript(p: LocalProject, scriptPath: string, newContent: string) {
    const scriptFile = await p.getFile(scriptPath);
    if (!scriptFile) {
        process.stdout.write(chalk.gray(sprintf(
            "No git hook %s in project at %s: Adding one\n",
            scriptPath,
            p.baseDir)));
        return p.addFile(scriptPath, newContent);
    } else {
        const content = await scriptFile.getContent();
        const start = content.indexOf(AtomistStartComment);
        if (!start) {
            return scriptFile.setContent(content + newContent);
        }

        const end = content.indexOf(AtomistEndComment);
        if (start < 0 || end < 0) {
            infoMessage("No Atomist content found in git hook %s in project at %s\n",
                scriptPath,
                p.baseDir,
                chalk.gray(content));
        }
        const updatedAtomist = content.slice(0, start) + newContent + content.substr(end + AtomistEndComment.length);
        await scriptFile.setContent(updatedAtomist);
        infoMessage(chalk.gray(sprintf(
            "Added Atomist content to git hook %s in project at %s\n",
            scriptPath,
            p.baseDir,
            updatedAtomist)));
    }
}

/**
 * Remove Atomist hook from this script
 * @param {LocalProject} p
 * @param {string} scriptPath
 * @return {Promise<void>}
 */
async function deatomizeScript(p: LocalProject, scriptPath: string) {
    const script = await p.getFile(scriptPath);
    if (!script) {
        process.stdout.write(chalk.gray(sprintf(
            "No git hook %s in project at %s\n",
            scriptPath,
            p.baseDir)));
    } else {
        const content = await script.getContent();
        const start = content.indexOf(AtomistStartComment);
        const end = content.indexOf(AtomistEndComment);
        if (start < 0 || end < 0) {
            warningMessage("remove-git-hooks: No Atomist content found in git hook %s in project at %s\n",
                scriptPath,
                p.baseDir,
                chalk.gray(content));
        }
        const nonAtomist = content.slice(0, start) + content.substr(end + AtomistEndComment.length);
        if (nonAtomist.trim().length > 0) {
            await script.setContent(nonAtomist);
            infoMessage(chalk.gray(sprintf(
                "Removing Atomist content from git hook %s in project at %s\n",
                scriptPath,
                p.baseDir,
                nonAtomist)));
        } else {
            await p.deleteFile(scriptPath);
            infoMessage(chalk.gray(sprintf(
                "Removing Atomist git hook %s in project at %s\n",
                scriptPath,
                p.baseDir)));
        }
    }
}

/* tslint:disable */

/**
 * Indexed templates fragments for use in git hooks
 * @return {{"pre-receive": string}}
 */
function scriptFragments() {

    // TODO why does the hook need be verbose?
    return {
        "pre-receive": `
export ATOMIST_GITHOOK_VERBOSE="true"

read oldrev newrev refname
atomist-githook pre-receive \${PWD} $refname $newrev &
`,
        "post-commit": `
sha=$(git rev-parse HEAD)
branch=$(git rev-parse --abbrev-ref HEAD)
atomist-githook post-commit \${PWD} $branch $sha &
`,
        "post-merge": `
sha=$(git rev-parse HEAD)
branch=$(git rev-parse --abbrev-ref HEAD)
atomist-githook post-merge \${PWD} $branch $sha &
`,
    };
}

const AtomistStartComment = "######## Atomist start #######";
const AtomistEndComment = "######## Atomist end #########";

/**
 * Make it clear this is Atomist content. Makes it easy to remove later.
 * @param {string} toAppend
 * @return {string}
 */
function markAsAtomistContent(toAppend: string) {
    return `\n${AtomistStartComment}\n${toAppend}\n${AtomistEndComment}\n`;
}


