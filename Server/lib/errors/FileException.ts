import Exception from "./Exception";

export default class AuthenticationException extends Exception {
    id = "AUTHEX";

    constructor(message?: string, extra?: string) {
        super(message || "Could not authenticate this user or action", extra);
    }
}