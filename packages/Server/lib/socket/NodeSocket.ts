import * as WebSocket from "ws";
import {Server, ServerOptions} from "ws";
import SocketConnectionCallback from "./SocketConnectionCallback";
import SocketConnection from "./SocketConnection";
import {Stringifyable} from "../Stringifyable";

/**
 * WebSocket wrapper
 */
export default class NodeSocket {
    public server: Server;

    /**
     * Create a new NodeSocket
     * @param port_httpServer_options - The port, server or options to create the socket from
     * @param connection - A callback to run when there is a new connection
     */
    constructor(port_httpServer_options: number | ServerOptions | Server, connection: SocketConnectionCallback) {
        if (typeof port_httpServer_options === "number")
            this.server = new WebSocket.Server({
                port: port_httpServer_options
            });
        else if (typeof port_httpServer_options === "object") {
            this.server = new WebSocket.Server(port_httpServer_options);
        } else this.server = new WebSocket.Server({
                server: port_httpServer_options
            });

        this.server.on("connection", (client, req) => {
            connection(new SocketConnection(client, req));
        });

        this.server.on("error", () => {});
    }

    /**
     * Broadcast an event to everyone who is connected
     * @param name
     * @param data
     */
    broadcast(name: string, data: Stringifyable) {
        this.server.clients.forEach(client => {
            SocketConnection.sendToClient(client, name, data);
        });
    }
}