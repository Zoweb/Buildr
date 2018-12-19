import {Stringifyable} from "./Stringifyable";
import SocketEvent from "./SocketEvent";
import Timer = NodeJS.Timer;
import SocketListeners from "./SocketListeners";
import SocketMessage from "./SocketMessage";
import {Logger} from "../getLogger";
import OnAnyCallback from "./OnAnyCallback";
import * as crypto from "crypto";
import objectContainsAll from "../tool/objectContainsAll";
import Exception from "../errors/Exception";
import createErrorFromObject from "../tool/createErrorFromObject";

function randomBytes(size: number) {
    return crypto.randomBytes(size).toString("hex");
}

const logger = Logger.create("SocketClient");

export default class SocketClient {
    get state() {
        return this._socket.readyState;
    }

    _emit(event: string, data?: Stringifyable, requestId?: string) {
        this._onAny.forEach(callback => callback(event, data, requestId));

        let listeners = this._listeners[event];
        if (!listeners) return;

        listeners.forEach(listener => {
            if (typeof listener !== "function") return;

            listener(data, requestId);
        })
    }

    private _readQueue() {
        let ev = this._messageQueue.shift();

        this._onAnySend.forEach(callback =>  callback(ev.name, ev.data, ev.requestId));

        this._socket.send(JSON.stringify({
            event: ev.name,
            data: ev.data,
            requestId: ev.requestId,
            type: typeof ev.data
        }));
    }

    private _connect() {
        this._socket = new WebSocket(this.url);

        this._socket.onopen = () => {
            console.debug("Connected");
            this._emit("connect");
            while (this._messageQueue.length) {
                this._readQueue();
            }
        };

        this._socket.onmessage = e => {
            if (!e.isTrusted) console.warn("Recieved untrusted event through socket");
            let message = e.data;
            let obj = JSON.parse(message.toString());
            this._emit(obj.event, obj.data, obj.requestId);
        };

        this._socket.onerror = e => {
            console.error(new Error("An error occurred in the socket"));
            this._emit("error", {
                name: e["name"],
                message: e["message"]
            });
        };
    }

    private _socket: WebSocket;
    private _listeners: SocketListeners = {};
    private _onAny: OnAnyCallback[] = [];
    private _onAnySend: OnAnyCallback[] = [];
    private _messageQueue: SocketMessage[] = [];
    private _errorCount: number = 0;

    public url: string;
    public handshake: Timer;
    public ping: number;

    public constructor(url: string) {
        this.url = "ws://" + url.replace(/[a-z]+:\/\//, "");

        console.info("Connecting to socket server at", this.url);

        this._connect();

        this.handshake = setInterval(() => {
            if (this.state === WebSocket.OPEN) {
                this._errorCount = 0;
                this.send("handshake", Date.now());
            } else if (this.state === WebSocket.CLOSED) {
                if (this._errorCount >= 3) {
                    this._emit("disconnect", {
                        reason: "handshake"
                    });
                    return;
                }
                this._errorCount++;

                console.info(`Attempting to reconnect (${this._errorCount}/3)`);
                this._connect();
            }
        }, 500);

        this.on("handshake", (difference: number) => {
            this.ping = difference;
        });
    }

    public on(event: string, callback: SocketEvent) {
        if (!this._listeners[event]) this._listeners[event] = [];

        this._listeners[event].push(callback);
    }

    once(event: string, timeout: number = 1000, id?: string): Promise<Stringifyable> {
        if (!this._listeners[event]) this._listeners[event] = [];

        return new Promise((yay, nay) => {
            let index = this._listeners[event].length, timedOut = false;
            this._listeners[event].push((data, requestId) => {
                if (requestId !== id) return;
                yay(data);
                delete this._listeners[event][index];
            });

            if (timeout !== -1) {
                // Time out
                setTimeout(() => {
                    timedOut = true;
                    nay(new Error(`Timeout when getting response for \`${event}\``));
                }, timeout);
            }
        });
    }

    send(name: string, data: Stringifyable, requestId?: string) {
        this._messageQueue.push({
            name,
            data,
            requestId
        });

        if (this.state === WebSocket.OPEN) this._readQueue();
    }

    sendDelayed(name: string, data: Stringifyable) {
        return () => {
            this.send(name, data);
        };
    }

    close() {
        this._socket.close();
    }

    async get(name: string, data: Stringifyable = {}, timeout: number = 1000): Promise<Stringifyable> {
        const id = randomBytes(16);

        console.debug("Sending:", id, ":", name);
        this.send(name, data, id);
        const result = await this.once(name, timeout, id);
        console.debug("Response type:", result["type"]);
        if (result["type"] === "error") {
            if (typeof result["error"] === "object" && objectContainsAll(result["error"], ["name", "message"])) {
                result["error"]["message"] += ` (from socket event: ${name})`;
                throw createErrorFromObject(result["error"]);
            } else if (typeof result["error"] === "string") {
                throw createErrorFromObject({
                    message: `${result["error"]} (from socket event: ${name})`
                });
            }
        }

        return result;
    }

    onAny(callback: OnAnyCallback) {
        this._onAny.push(callback);
    }

    onAnySend(callback: OnAnyCallback) {
        this._onAnySend.push(callback);
    }
}