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

import { logger } from "@atomist/automation-client";
import {
    Destination,
    MessageClient,
    MessageOptions,
    SlackMessageClient,
} from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";

/**
 * MessageClient implementation that delegates to many message clients
 */
export class BroadcastingMessageClient implements MessageClient, SlackMessageClient {

    private readonly delegates: Array<MessageClient & SlackMessageClient>;

    public addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        logger.debug("Broadcast.addressChannels: %j", msg);
        return Promise.all(
            this.delegates.map(d => {
                try {
                    return d.addressChannels(msg, channels, options);
                } catch {
                    // Ignore and continue
                }
            }));
    }

    public addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        logger.debug("Broadcast.addressUsers: %j", msg);
        return Promise.all(
            this.delegates.map(d => {
                try {
                    return d.addressUsers(msg, users, options);
                } catch {
                    // Ignore and continue
                }
            }));
    }

    public respond(msg: any, options?: MessageOptions): Promise<any> {
        logger.debug("Broadcast.respond: %j", msg);
        return Promise.all(
            this.delegates.map(d => {
                try {
                    return d.respond(msg, options);
                } catch {
                    // Ignore and continue
                }
            }));
    }

    public send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        logger.debug("Broadcast.send: %j", msg);
        return Promise.all(
            this.delegates.map(d => {
                try {
                    return d.send(msg, destinations, options);
                } catch {
                    // Ignore and continue
                }
            }));
    }

    constructor(...delegates: Array<MessageClient & SlackMessageClient>) {
        this.delegates = delegates.filter(d => !!d);
    }

}
