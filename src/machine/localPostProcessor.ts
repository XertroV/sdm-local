import { Configuration, logger, } from "@atomist/automation-client";
import * as _ from "lodash";
import { LocalGraphClient } from "../binding/LocalGraphClient";
import { DefaultAutomationClientConnectionConfig } from "../entry/resolveConnectionConfig";
import { AllMessagesPort } from "../invocation/cli/command/addStartListenerCommand";
import { BroadcastingMessageClient } from "../invocation/cli/io/BroadcastingMessageClient";
import { GoalEventForwardingMessageClient } from "../invocation/cli/io/GoalEventForwardingMessageClient";
import { HttpClientMessageClient } from "../invocation/cli/io/HttpClientMessageClient";
import { SystemNotificationMessageClient } from "../invocation/cli/io/SystemNotificationMessageClient";
import { CommandHandlerInvocation, invokeCommandHandler, } from "../invocation/http/CommandHandlerInvocation";
import { channelFor, clientIdentifier, } from "./correlationId";
import { createSdmOptions } from "./createSdmOptions";
import { isLocal } from "./isLocal";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { NotifyOnCompletionAutomationEventListener } from "./support/NotifyOnCompletionAutomationEventListener";

/**
 * Configures an automation client in local mode
 * @param {LocalMachineConfig} localMachineConfig
 * @return {(configuration: Configuration) => Promise<Configuration>}
 */
export function configureLocal(localMachineConfig: LocalMachineConfig): (configuration: Configuration) => Promise<Configuration> {
    return async configuration => {

        // Don't mess with a non local machine
        if (!isLocal()) {
            return configuration;
        }

        logger.info("Disable web socket connection");
        configuration.ws.enabled = false;

        configureWebEndpoints(configuration, localMachineConfig);

        setMessageClient(configuration, localMachineConfig);
        setGraphClient(configuration);

        if (!configuration.listeners) {
            configuration.listeners = [];
        }
        configuration.listeners.push(new NotifyOnCompletionAutomationEventListener());

        const localModeSdmConfigurationElements = createSdmOptions(localMachineConfig);

        // Need extra config to know how to set things in the SDM
        configuration.sdm = {
            ...configuration.sdm,
            ...localModeSdmConfigurationElements,
        };
        return configuration;
    };
}

function configureWebEndpoints(configuration: Configuration, localMachineConfig: LocalMachineConfig) {
    // Disable auth as we're only expecting local clients
    // TODO what if not basic
    _.set(configuration, "http.auth.basic.enabled", false);

    configuration.http.customizers = [
        exp => {
            // TODO could use this to set local mode for a server - e.g. the name to send to
            exp.get("/localConfiguration", async (req, res) => {
                res.json(localMachineConfig);
            });
            // Add a GET route for convenient links to command handler invocation, as a normal automation client doesn't expose one
            exp.get("/command-get/:name", async (req, res) => {
                // TODO this should really forward to a page exposing the parameters, which populates from the query
                const payload = req.query;
                const invocation: CommandHandlerInvocation = {
                    name: req.params.name,
                    parameters: payload,
                    mappedParameters: [],
                };
                // TODO parameterize this path
                const r = await invokeCommandHandler(DefaultAutomationClientConnectionConfig, invocation);
                return res.json(r);
            });
        },
    ];
}

/**
 * Use custom message client to update HTTP listeners and forward goal events back to the SDM via HTTP
 * @param {Configuration} configuration
 * @param {LocalMachineConfig} localMachineConfig
 */
function setMessageClient(configuration: Configuration, localMachineConfig: LocalMachineConfig) {
    configuration.http.messageClientFactory =
        aca => {
            const channel = channelFor(aca.context.correlationId);
            return new BroadcastingMessageClient(
                new HttpClientMessageClient(channel, AllMessagesPort),
                new GoalEventForwardingMessageClient(DefaultAutomationClientConnectionConfig),
                new HttpClientMessageClient(channel, clientIdentifier(aca.context.correlationId)),
                localMachineConfig.useSystemNotifications ? new SystemNotificationMessageClient(channel) : undefined,
            );
        };
}

function setGraphClient(configuration: Configuration) {
    configuration.http.graphClientFactory =
        () => new LocalGraphClient(false);
}
