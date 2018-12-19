import {LogColour} from "./LogColour";

export enum LogLevel {
    LEMON,
    DEBUG,
    INFO,
    WARN,
    ERROR
}

export function getLevelColour(level: LogLevel): LogColour {
    switch (level) {
        case LogLevel.LEMON: return LogColour.PURPLE;
        case LogLevel.DEBUG: return LogColour.BLUE;
        case LogLevel.INFO: return LogColour.CYAN;
        case LogLevel.WARN: return LogColour.ORANGE;
        case LogLevel.ERROR: return LogColour.RED;
        default: return LogColour.DEFAULT;
    }
}

export function getLevelName(level: LogLevel): string {
    switch (level) {
        case LogLevel.LEMON: return "lemon";
        case LogLevel.DEBUG: return "debug";
        case LogLevel.INFO: return "info";
        case LogLevel.WARN: return "warn";
        case LogLevel.ERROR: return "error";
        default: return "unknown";
    }
}

export function isLevelEnabled(test: LogLevel, max: LogLevel): boolean {
    return max <= test;
}