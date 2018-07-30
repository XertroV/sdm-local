import { logger } from "@atomist/automation-client";
import {
    Destination,
    MessageClient,
    MessageOptions,
    SlackDestination,
    SlackMessageClient,
} from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import axios from "axios";
import { DevNullMessageClient } from "./devNullMessageClient";
import { isSdmGoalStoreOrUpdate } from "./GoalEventForwardingMessageClient";
import {
    messageListenerEndpoint,
    StreamedMessage,
} from "./httpMessageListener";

/**
 * Message client that POSTS to an Atomist server and logs to a fallback otherwise
 */
export class HttpClientMessageClient implements MessageClient, SlackMessageClient {

    public async respond(message: any, options?: MessageOptions): Promise<any> {
        return this.addressChannels(message, this.linkedChannel, options);
    }

    public async send(msg: string | SlackMessage, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        if (isSdmGoalStoreOrUpdate(msg)) {
            // We don't need to do anything about this
            return;
        }
        const dests = Array.isArray(destinations) ? destinations : [destinations];
        return this.stream({ message: msg, options, destinations: dests },
            () => this.delegate.send(msg, destinations, options));
    }

    public async addressChannels(message: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        return this.stream({
            message,
            options,
            destinations: [{
                team: "T1234",
                channels,
            } as SlackDestination],
        }, () => this.delegate.addressChannels(message, channels, options));
    }

    public async addressUsers(message: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        return this.addressChannels(message, users, options);
    }

    private async stream(sm: StreamedMessage, fallback: () => Promise<any>) {
        try {
            logger.debug(`Write to url ${this.url}: ${JSON.stringify(sm)}`);
            await axios.post(this.url, sm);
            logger.info(`Wrote to url ${this.url}: ${JSON.stringify(sm)}`);
        } catch (err) {
            logger.info("Cannot POST to log service at [%s]: %s", this.url, err.message);
            return fallback();
        }
    }

    private readonly url: string;

    constructor(private readonly linkedChannel: string,
                port: number,
                private readonly delegate: MessageClient & SlackMessageClient =
                    DevNullMessageClient) {
        this.url = messageListenerEndpoint(port);
    }
}