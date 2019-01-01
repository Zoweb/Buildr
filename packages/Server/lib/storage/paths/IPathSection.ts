import {Stringifyable} from "../../Stringifyable";

export default interface IPathSection {
    toString(): string;
    getFrom(obj: Stringifyable): Stringifyable;
    setFrom(obj: Stringifyable, value: Stringifyable): void;
}