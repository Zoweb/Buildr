import {mkdirpSync, mkdirsSync} from "fs-extra-promise";
import * as bunyan from "bunyan";
import * as callsiteRecord from "callsite-record";
import {existsSync} from "fs";

const loggerExport = {
    create(name) {
        // create output directory if it doesn't exist
        if (!existsSync("logs")) mkdirsSync("logs");

        return bunyan.createLogger({
            name,

            streams: [
                {
                    level: "trace",
                    stream: process.stdout
                },
                {
                    type: "rotating-file",
                    period: "1d",
                    level: "trace",
                    count: 12,
                    path: `logs/latest.log`
                }
            ],

            serializers: {
                res: bunyan.stdSerializers.res,
                req: bunyan.stdSerializers.req,

                err(err: Error | string) {
                    if (typeof err === "string") err = new Error(err);
                    const record = callsiteRecord({
                        forError: err
                    });

                    if (record === null) return err.message;

                    try {
                        return err.message + "\n\n" + record.renderSync({
                            renderer: callsiteRecord.renderers.default,
                            stackFilter(frame) {
                                return !frame.fileName.includes("node_modules")
                            }
                        });
                    } catch {
                        return "[could not generate filter] " + err.message;
                    }
                }
            }
        })
    }
};

export {loggerExport as Logger};