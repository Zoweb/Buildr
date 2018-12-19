import {Stringifyable} from "../Stringifyable";

/**
 * The callback containing information sent from the client
 */
export default interface SocketEvent {
    (response: Stringifyable, requestId?: string): void;
}