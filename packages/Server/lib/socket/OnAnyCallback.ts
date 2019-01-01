import {Stringifyable} from "../Stringifyable";

export default interface OnAnyCallback {
    (event: string, data: Stringifyable, requestId?: string): void;
}