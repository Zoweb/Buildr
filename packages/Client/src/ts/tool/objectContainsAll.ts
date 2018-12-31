import {Stringifyable} from "../socket/Stringifyable";

export default function objectContainsAll(object: Stringifyable, required: string[]): boolean {
    const keys = Object.keys(object);
    return required.every(it => keys.indexOf(it) !== -1);
}