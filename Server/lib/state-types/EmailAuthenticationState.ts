import SocketConnection from "../socket/SocketConnection";

export default interface EmailAuthenticationState {
    email: string;
    client: SocketConnection;
}