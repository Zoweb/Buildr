import {Stringifyable} from "./Stringifyable";

export default interface SocketEvent {
    (response: Stringifyable, requestId?: string): void;
}