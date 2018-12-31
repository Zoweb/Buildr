import Exception from "./Exception";

export default class InvalidRequestException extends Exception {
    constructor(type?: string, message?: string) {
        super(message || "Request was invalid", type);
    }
}