import SocketClient from "../socket/SocketClient";
import {Logger} from "../getLogger";
import {Stringifyable} from "../socket/Stringifyable";
import {Record} from "runtypes";

const logger = Logger.create("ResourceClient");

export default class ResourceClient {
    private _authWaiters: {yay: Function, nay: Function}[] = [];

    authCode: string = null;
    connection: SocketClient;
    language: string = "en";

    connect(host: string, port: number, path?: string) {
        const url = `ws://${host}:${port}/${path ? path : ""}`;
        console.debug(`Connecting to ${url}`);
        this.connection = new SocketClient(url);

        this.connection.onAny((name, data, requestId) => {
            if (name === "handshake") return;
            console.debug(`Event: ${requestId}: ${name}: ${JSON.stringify(data)}`);
        });
    }

    getResource(path: string) {
        return this.get("resource", {
            path
        });
    }

    waitUntilAuthentication() {
        return new Promise((yay, nay) => {
            this._authWaiters.push({yay, nay});
        });
    }

    setAuthCode(authCode: string) {
        this.authCode = authCode;

        this._authWaiters.forEach(it => it.yay());
        this._authWaiters.length = 0;
    }

    get(event: string, data?: Stringifyable, timeout?: number) {
        return this.connection.get(event, {
            authCode: this.authCode,
            data
        }, timeout);
    }

    async getTyped(type: Record<any>, event: string, data?: Stringifyable, timeout?: number): Promise<Stringifyable> {
        const response = await this.get(event, data, timeout);
        const validation = type.validate(response);
        if (validation.success === false) throw new TypeError("Invalid response type: " + validation.message);
        return response;
    }
}