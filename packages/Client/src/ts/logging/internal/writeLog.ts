import {LogColour} from "../LogColour";
import LogMessage from "./LogMessage";

function renderColour(colour: LogColour): string {
    switch (colour) {
        case LogColour.RED:     return "red";
        case LogColour.ORANGE:  return "orange";
        case LogColour.YELLOW:  return "yellow";
        case LogColour.GREEN:   return "green";
        case LogColour.CYAN:    return "cyan";
        case LogColour.BLUE:    return "blue";
        case LogColour.PURPLE:  return "purple";
        case LogColour.WHITE:   return "white";
        case LogColour.BLACK:   return "black";
        case LogColour.DEFAULT: return "";
        default: return "";
    }
}

export default function writeLog(messages: LogMessage[]) {
    let msg = "";
    const colours = [];

    for (const message of messages) {
        msg += "%c";
        colours.push(message.colour);
        if (message.useMessage) msg += message.message + " ";
        if (message.useError) msg += message.error.stack;
    }

    console.log(msg, ...colours.map(colour => "color:" + renderColour(colour)));
}