import Exception from "./Exception";

export default class NullReferenceException extends Exception {
    constructor(prop?: string, message?: string) {
        super(message || "Object reference not set to an instance of an object.", prop);
    }
}