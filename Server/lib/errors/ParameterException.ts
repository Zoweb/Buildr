import Exception from "./Exception";

export default class ParameterException extends Exception {
    public constructor(expectedType: string | Function, found: any, paramName?: string, message?: string) {
        super(`Expecting ${typeof expectedType === "string" ? expectedType : expectedType.name}, found ${found["constructor"] ? found.constructor.name : typeof found}${paramName ? " " + paramName : ""}: ${found}`,
            message);
    }
}