import Exception from "./Exception";

export default class AuthenticationException extends Exception {
    constructor(message?: string, extra?: string) {
        super(message || "Could not authenticate this user or action", extra);
    }
}