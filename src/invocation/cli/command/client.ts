import {
    config,
    gitInfo,
    gqlFetch,
    gqlGen,
    kube,
    start,
} from "./support/commands";

const Package = "atomist";

const compileDescribe = "Run 'npm run compile' before running";
const installDescribe = "Run 'npm install' before running/compiling, default is to install if no " +
    "'node_modules' directory exists";

export function addClientCommands(yargs: any) {
    yargs.command(["start", "st", "run"], "Start an SDM or automation client", ya => {
        return ya
            .option("change-dir", {
                alias: "C",
                default: process.cwd(),
                describe: "Path to automation client project",
                type: "string",
            })
            .option("compile", {
                default: true,
                describe: compileDescribe,
                type: "boolean",
            })
            .option("local", {
                default: false,
                describe: "Start in local mode?",
                type: "boolean",
            })
            .option("install", {
                describe: installDescribe,
                type: "boolean",
            });
    }, argv => {
        try {
            const status = start(argv["change-dir"], argv.install, argv.compile, argv.local);
            process.exit(status);
        } catch (e) {
            console.error(`${Package}: Unhandled Error: ${e.message}`);
            process.exit(101);
        }

    })
        .command(["gql-fetch <workspace-id>"], "Introspect GraphQL schema", ya => {
            return (ya as any)
                .positional("workspace-id", {
                    describe: "Atomist workspace/team ID",
                    required: true,
                })
                .option("token", {
                    alias: "T",
                    describe: "Token to use for authentication",
                    default: process.env.ATOMIST_TOKEN || process.env.GITHUB_TOKEN,
                    type: "string",
                })
                .option("change-dir", {
                    alias: "C",
                    default: process.cwd(),
                    describe: "Path to automation client project",
                    type: "string",
                })
                .option("install", {
                    describe: installDescribe,
                    type: "boolean",
                });
        }, argv => {
            gqlFetch(argv["change-dir"], argv["workspace-id"], argv.token, argv.install)
                .then(status => process.exit(status), err => {
                    console.error(`${Package}: Unhandled Error: ${err.message}`);
                    process.exit(101);
                });
        })
        .command(["gql-gen <glob>", "gql <glob>"], "Generate TypeScript code for GraphQL", ya => {
            return ya
                .option("change-dir", {
                    alias: "C",
                    default: process.cwd(),
                    describe: "Path to automation client project",
                    type: "string",
                })
                .option("install", {
                    describe: installDescribe,
                    type: "boolean",
                });
        }, argv => {
            gqlGen(argv["change-dir"], argv.glob, argv.install)
                .then(status => process.exit(status), err => {
                    console.error(`${Package}: Unhandled Error: ${err.message}`);
                    process.exit(101);
                });
        })
        .command("git", "Create a git-info.json file", ya => {
            return ya
                .option("change-dir", {
                    alias: "C",
                    describe: "Path to automation client project",
                    default: process.cwd(),
                });
        }, argv => {
            gitInfo(argv)
                .then(status => process.exit(status), err => {
                    console.error(`${Package}: Unhandled Error: ${err.message}`);
                    process.exit(101);
                });
        })
        .command("config", "Configure environment for running automation clients", ya => {
            return ya
                .option("atomist-token", {
                    describe: "GitHub personal access token",
                    type: "string",
                })
                .option("github-user", {
                    describe: "GitHub user login",
                    type: "string",
                })
                .option("github-password", {
                    describe: "GitHub user password",
                    type: "string",
                })
                .option("github-mfa-token", {
                    describe: "GitHub user password",
                    type: "string",
                })
                .option("workspace-id", {
                    describe: "Atomist workspace/team ID",
                    type: "string",
                });
        }, argv => {
            config(argv)
                .then(status => process.exit(status), err => {
                    console.error(`${Package}: Unhandled Error: ${err.message}`);
                    process.exit(101);
                });
        })
        .command("kube", "Deploy Atomist Kubernetes utilities to your Kubernetes cluster", ya => {
            return ya
                .option("environment", {
                    describe: "Informative name for yout Kubernetes cluster",
                    type: "string",
                })
                .option("namespace", {
                    describe: "Deploy utilities in namespace mode",
                    type: "string",
                });
        }, argv => {
            kube(argv)
                .then(status => process.exit(status), err => {
                    console.error(`${Package}: Unhandled Error: ${err.message}`);
                    process.exit(101);
                });
        });
}