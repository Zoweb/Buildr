import Exception from "./Exception";

export default class AuthenticationException extends Exception {
    constructor(message?: string) {
        super(message || "Could not authenticate");
    }
}