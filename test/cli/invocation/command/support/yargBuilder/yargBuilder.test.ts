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

import * as assert from "assert";
import {
    freshYargBuilder,
} from "../../../../../../src/cli/invocation/command/support/yargBuilder";

describe("yarg saver", () => {

    it("errors when there are duplicates", () => {

        const subject = freshYargBuilder();

        subject.withSubcommand(
            {
                command: "show skills",
                handler: async () => "I am showing the skills",
                describe: "Command 1",
                parameters: [],
            },
        );
        subject.withSubcommand(
            {
                command: "show skills",
                handler: async () => "I am showing the mad skillz",
                describe: "Command 2",
                parameters: [],
            },
        );

        assert.throws(() => {
            subject.build();
        });

    });

    it("drops a polite duplicate", () => {

        const subject = freshYargBuilder();

        subject.withSubcommand(
            {
                command: "show skills",
                handler: async () => "I am showing the skills",
                describe: "Command 1",
                parameters: [],
            },
        );
        subject.withSubcommand(
            {
                command: "show skills",
                handler: async () => "I am showing the mad skillz",
                describe: "Command 2",
                parameters: [],
                conflictResolution: { failEverything: false, commandDescription: "good job me" },
            },
        );

        const combined = subject.build() as any;

        assert(combined.helpMessages.some((line: string) => line.includes("good job me")), "Help message was: " + combined.helpMessages.join("\n"));

    });

    it("can combine a multiword positional command with another one that shares the same first word", () => {

        const subject = freshYargBuilder();

        subject.withSubcommand(
            {
                command: "show skills <and> <stuff>",
                handler: async (a) => "whatever",
                describe: "Command 1",
                parameters: [],
            },
        );
        subject.withSubcommand(
            {
                command: "show other things",
                handler: async (a) => { "no " },
                describe: "Command 2",
                parameters: [],
                conflictResolution: { failEverything: false, commandDescription: "good job me" },
            },
        );

        const combined = subject.build();

        const tree = treeifyNested(combined);


        const expected = {
            "show": {
                "skills": {},
                "other": { "things": {} }
            }
        };

        assert.deepEqual(tree, expected, JSON.stringify(tree, null, 2));

    })
});

function treeifyNested(c: any, tree: { [key: string]: any } = {}) {
    if (!c.nested) {
        return tree;
    }
    c.nested.forEach((n: any) => {
        tree[(n.commandName as string)] = treeifyNested(n)
    })
    return tree;
}