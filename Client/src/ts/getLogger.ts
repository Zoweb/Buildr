import {createLogger, stdSerializers} from "browser-bunyan";
import * as Bunyan from "bunyan";
import {ConsoleFormattedStream} from "@browser-bunyan/console-formatted-stream";

const Logger = {
    create(name: string): Bunyan {
        return createLogger({
            name: name,
            serializers: stdSerializers,
            streams: [
                {
                    level: "debug",
                    stream: new ConsoleFormattedStream()
                }
            ]
        })
    }
};

export {Logger};