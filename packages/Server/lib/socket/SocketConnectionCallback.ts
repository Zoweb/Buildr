import SocketConnection from "./SocketConnection";

/**
 * The callback containing a {@see SocketConnection}
 */
export default interface SocketConnectionCallback {
    (client: SocketConnection): void;
}