import {LogColour} from "../LogColour";

export default class LogMessage {
    message: String;
    useMessage: boolean;
    error: Error;
    useError: boolean;
    colour: LogColour;

    constructor(message: String, useMessage: boolean, error: Error, useError: boolean, colour: LogColour) {
        this.message = message;
        this.useMessage = useMessage;
        this.error = error;
        this.useError = useError;
        this.colour = colour;
    }
}