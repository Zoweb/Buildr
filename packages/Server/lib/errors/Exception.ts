export default class Exception extends Error {
    private static _exceptions: Exception[] = [];
    public static get(id: string): Exception {
        return this._exceptions[id] || null;
    }

    public readonly data: any = {};
    public readonly id: string | number;
    public readonly info: string;

    public constructor(message?: string, info?: string) {
        super(message);
        Error.captureStackTrace(this, Exception);

        this.info = info;

        this.id = Exception._exceptions.length;
        Exception._exceptions.push(this);
    }
}