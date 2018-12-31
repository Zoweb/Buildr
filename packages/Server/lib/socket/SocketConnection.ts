import * as WebSocket from "ws";
import {IncomingMessage} from "http";
import SocketListeners from "./SocketListeners";
import SocketEvent from "./SocketEvent";
import {Stringifyable} from "../Stringifyable";
import OnAnyCallback from "./OnAnyCallback";
import * as crypto from "crypto";
import {Logger} from "../getLogger";
import {ResponderFunction} from "./ResponderFunction";

const logger = Logger.create("socket/SocketConnection");

function randomBytes(size: number) {
    return crypto.randomBytes(size).toString("hex");
}

/**
 * The connection between a client socket and us
 */
export default class SocketConnection {
    /**
     * Sends data to a client
     * @param client - The client to send the data to
     * @param name - The event's name
     * @param data - The data to send to the client
     * @param requestId - ID of the request
     */
    public static sendToClient(client: WebSocket, name: string, data: Stringifyable, requestId?: string) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                event: name,
                data: data,
                type: typeof data,
                requestId
            }));
        }
    }

    private readonly _client: WebSocket;
    private _req: IncomingMessage;
    private _listeners: SocketListeners = {};
    private _onAny: OnAnyCallback[] = [];

    private _emit(event: string, data?: Stringifyable, requestId?: string) {
        this._onAny.forEach(callback => callback(event, data));

        let listeners = this._listeners[event];
        if (!listeners) {
            this.send("error:404", {
                event
            });

            return;
        }

        listeners.forEach(listener => {
            if (typeof listener !== "function") return;

            listener(data, requestId);
        });
    }

    /**
     * Gets the client's IP
     * @returns {string}
     */
    public get ip() {
        return this._req.connection.remoteAddress.substr(
            this._req.connection.remoteAddress.lastIndexOf(":") + 1
        );
    }

    public constructor(client: WebSocket, req: IncomingMessage) {
        this._client = client;
        this._req = req;

        this._client.on("message", data => {
            let obj = JSON.parse(data.toString());

            this._emit(obj.event, obj.data, obj.requestId);
        });

        this._client.on("close", () => {
            this._emit("disconnect");
        });

        this._client.on("error", err => {
            this._emit("error", {
                type: "error",
                error: err
            });
            this._emit("disconnect");
        });

        this.on("handshake", (time: number) => {
            this.send("handshake", Date.now() - time);
        });
    }

    public send(name: string, data?: Stringifyable, requestId?: string) {
        SocketConnection.sendToClient(this._client, name, data, requestId);
    }

    public on(event: string, callback: SocketEvent) {
        if (!this._listeners[event]) this._listeners[event] = [];

        this._listeners[event].push(callback);
    }

    public onAny(callback: OnAnyCallback) {
        this._onAny.push(callback);
    }

    public once(event: string): Promise<Stringifyable> {
        if (!this._listeners[event]) this._listeners[event] = [];

        return new Promise(yay => {
            let index = this._listeners[event].length;
            this._listeners[event].push(data => {
                yay(data);
                delete this._listeners[event][index];
            });
        });
    }

    public respond(event: string, responder: ResponderFunction) {
        this.on(event, (data, requestId) => {
            try {
                const response = responder(data);
                if (response instanceof Promise) {
                    response.then(res => {
                        this.send(event, res, requestId);
                    }).catch(err => {
                        this.send(event, {
                            type: "error",
                            error: {
                                name: err.name,
                                message: err.message,
                                id: err["id"],
                                info: err["info"],
                                data: err["data"]
                            }
                        }, requestId);
                        logger.error(err);
                    });
                } else {
                    this.send(event, response, requestId);
                }
            } catch (err) {
                this.send(event, {
                    type: "error",
                    error: {
                        name: err.name,
                        message: err.message,
                        id: err["id"],
                        info: err["info"],
                        data: err["data"]
                    }
                }, requestId);
                logger.error(err);
            }
        });
    }
}