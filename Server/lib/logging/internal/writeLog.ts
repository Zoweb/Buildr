import {LogColour} from "../LogColour";
import LogMessage from "./LogMessage";

function renderColour(colour: LogColour): string {
    switch (colour) {
        case LogColour.RED: return "\x1b[31m";
        case LogColour.ORANGE: return "\x1b[33m";
        case LogColour.YELLOW: return "\x1b[33m";
        case LogColour.GREEN: return "\x1b[32m";
        case LogColour.CYAN: return "\x1b[36m";
        case LogColour.BLUE: return "\x1b[34m";
        case LogColour.PURPLE: return "\x1b[35m";
        case LogColour.WHITE: return "\x1b[37m";
        case LogColour.BLACK: return "\x1b[30m";
        case LogColour.DEFAULT: return "\x1b[0m";
        default: return "";
    }
}

export default function writeLog(messages: LogMessage[]) {
    let msg = "";
    const errors = [];

    for (const message of messages) {
        msg += renderColour(message.colour);
        if (message.useMessage) msg += message.message + " ";
        if (message.useError) msg += message.error.stack;
    }

    console.log(msg);
}