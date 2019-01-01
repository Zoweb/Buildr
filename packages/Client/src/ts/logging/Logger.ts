import {getLevelColour, getLevelName, isLevelEnabled, LogLevel} from "./LogLevel";
import LogMessage from "./internal/LogMessage";
import {LogColour} from "./LogColour";
import writeLog from "./internal/writeLog";

export default class Logger {
    static create(name: string): Logger {
        return new Logger(name, null);
    }

    private _name: String;
    private _parent: Logger;
    private _level: LogLevel = LogLevel.INFO;

    get name() { return this._name }

    get level() { return this._parent ? this._parent.level : this._level }
    set level(value: LogLevel) { if (this._parent) this._parent.level = value; else this._level = value }

    private constructor(name, parent) {
        this._name = name;
        this._parent = parent;
    }

    private generateLogMessages(level: LogLevel, msg: string, error: Error, useError: boolean) {
        if (!isLevelEnabled(level, this.level)) return;

        const messages = [
            new LogMessage(`(${this.name})`, true, null, false, LogColour.DEFAULT),
            new LogMessage(`[${getLevelName(level)}]`, true, null, false, getLevelColour(level))
        ];

        messages.push(new LogMessage(msg, true, null, false, LogColour.DEFAULT));

        console.log(msg, useError);
        if (useError) {
            messages.push(new LogMessage("\n", true, null, false, LogColour.DEFAULT));
            messages.push(new LogMessage(error.name + ": " + error.message + "\n", true, null, false, LogColour.RED));
            messages.push(new LogMessage(error.stack.split("\n").slice(1).join("\n"), true, null, false, LogColour.ORANGE));
        }

        writeLog(messages);
    }

    log(level: LogLevel, msg: string) { this.generateLogMessages(level, msg, null, false) }
    logError(level: LogLevel, error: Error, msg: string) { this.generateLogMessages(level, msg, error, true) }

    lemon(msg: string) { this.log(LogLevel.LEMON, msg) }
    debug(msg: string) { this.log(LogLevel.DEBUG, msg) }
    info(msg: string)  { this.log(LogLevel.INFO, msg) }
    warn(msg: string)  { this.log(LogLevel.WARN, msg) }
    error(error: Error, msg?: string) { this.logError(LogLevel.ERROR, error, msg) }

    getChild(name: string) { return new Logger(name, this) }
}