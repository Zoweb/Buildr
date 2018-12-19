import IPathSection from "./IPathSection";
import {Stringifyable} from "../../Stringifyable";

export default class ArrayPathSection implements IPathSection {
    index: number;

    constructor(index: number) {
        this.index = index;
    }

    toString(): string {
        return `[${this.index}]`;
    }

    getFrom(obj: Stringifyable): Stringifyable {
        return obj[this.index];
    }

    setFrom(obj: Stringifyable, value: Stringifyable) {
        obj[this.index] = value;
    }
}