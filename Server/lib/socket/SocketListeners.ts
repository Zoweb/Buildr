import SocketEvent from "./SocketEvent";

export default interface SocketListeners {
    [event: string]: SocketEvent[];
}