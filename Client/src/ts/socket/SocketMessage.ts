import {Stringifyable} from "./Stringifyable";

export default interface SocketMessage {
    name: string;
    data: Stringifyable;
    requestId?: string;
}