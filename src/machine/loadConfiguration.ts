import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { ProjectLoader, ProjectLoadingParameters, WithLoadedProject } from "@atomist/sdm";
import { createEphemeralProgressLog } from "@atomist/sdm/api-helper/log/EphemeralProgressLog";
import { EphemeralLocalArtifactStore } from "@atomist/sdm/internal/artifact/local/EphemeralLocalArtifactStore";
import { CachingProjectLoader } from "@atomist/sdm/project/CachingProjectLoader";
import { execSync } from "child_process";
import { EnvironmentTokenCredentialsResolver } from "../binding/EnvironmentTokenCredentialsResolver";
import { expandedDirectoryRepoFinder } from "../binding/expandedDirectoryRepoFinder";
import { fileSystemProjectPersister } from "../binding/fileSystemProjectPersister";
import { LocalRepoRefResolver } from "../binding/LocalRepoRefResolver";
import { MappedParameterResolver } from "../binding/MappedParameterResolver";
import { LocalSoftwareDeliveryMachineConfiguration } from "./LocalSoftwareDeliveryMachineConfiguration";

//            ed.targets = new LocalTargetsParams(this.configuration.repositoryOwnerParentDirectory);

export function loadConfiguration(
    repositoryOwnerParentDirectory: string,
    mappedParameterResolver: MappedParameterResolver = ResolveNothingMappedParameterResolver): LocalSoftwareDeliveryMachineConfiguration {
    const repoRefResolver = new LocalRepoRefResolver(repositoryOwnerParentDirectory);
    return {
        sdm: {
            artifactStore: new EphemeralLocalArtifactStore(),
            projectLoader: new MonkeyingProjectLoader(new CachingProjectLoader(), pushToAtomistBranch),
            logFactory: createEphemeralProgressLog,
            credentialsResolver: EnvironmentTokenCredentialsResolver,
            repoRefResolver,
            repoFinder: expandedDirectoryRepoFinder(repositoryOwnerParentDirectory),
            projectPersister: fileSystemProjectPersister(repositoryOwnerParentDirectory),
        },
        repositoryOwnerParentDirectory,
        mappedParameterResolver,
    };
}

const ResolveNothingMappedParameterResolver: MappedParameterResolver = {
    resolve: () => undefined,
};

/**
 * Project loader that performs additional steps before acting on the project
 */
class MonkeyingProjectLoader implements ProjectLoader {

    public doWithProject<T>(params: ProjectLoadingParameters, action: WithLoadedProject<T>): Promise<T> {
        const action2 = async p => {
            const p2 = await this.monkeyWith(p);
            return action(p2);
        };
        return this.delegate.doWithProject(params, action2);
    }

    constructor(private readonly delegate: ProjectLoader,
                private readonly monkeyWith: (p: GitProject) => Promise<GitProject>) {
    }

}

async function pushToAtomistBranch(p: GitProject): Promise<GitProject> {
    p.push = async opts => {
        await p.createBranch(`atomist/${p.branch}`);
        execSync(`git push --force --set-upstream origin ${p.branch}`, { cwd: p.baseDir });
        return { target: p, success: true };
    };
    return p;
}
