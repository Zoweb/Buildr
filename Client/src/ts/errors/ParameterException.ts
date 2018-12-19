import Exception from "./Exception";

export default class ParameterException extends Exception {
    public constructor(expectedType: string | Function, found: any, paramName?: string, message?: string) {
        super(`Expecting ${typeof expectedType === "string" ? expectedType : expectedType.name}, found ${"constructor" in found ? found.constructor.name : typeof found}${paramName ? " " + paramName : ""}`,
            message);
    }
}