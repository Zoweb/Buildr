import {Stringifyable} from "../socket/Stringifyable";

export default class Exception extends Error {
    private static _exceptions: Exception[] = [];
    public static get(id: number): Exception {
        return this._exceptions[id] || null;
    }

    public readonly data: Stringifyable = {};
    public readonly id: number;
    public readonly info: string;
    public readonly name: string;

    public constructor(message?: string, info?: string) {
        super(message);
        Error.captureStackTrace(this, Exception);

        this.info = info;

        this.id = Exception._exceptions.length;
        Exception._exceptions.push(this);
    }
}