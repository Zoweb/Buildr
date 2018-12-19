import IPathSection from "./IPathSection";
import {Stringifyable} from "../../Stringifyable";

export default class DictionaryPathSection implements IPathSection {
    key: string;

    constructor(key: string) {
        this.key = key;
    }

    toString(): string {
        return `.${this.key}`;
    }

    getFrom(obj: Stringifyable): Stringifyable {
        return obj[this.key];
    }

    setFrom(obj: Stringifyable, value: Stringifyable) {
        obj[this.key] = value;
    }
}