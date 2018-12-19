import * as readline from "readline";
import * as fs from "fs";
import * as base64 from "base-64";
import * as path from "path";
import * as url from "url";
const SourceMap = require("source-map");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

function readLine(): Promise<string> {
    return new Promise(yay => {
        rl.once("line", yay);
    });
}

(async function run() {
    console.log("Paste the stack below. Leave an empty line to finish and run calculations.");

    let lines: string[] = [];
    while (true) {
        const data = await readLine();
        lines.push(data);

        if (!data) break;
    }

    lines = lines.join("\n").split("\n"); // remove stray `\n`s

    // remove first 2 lines
    lines.shift();
    lines.shift();

    console.log(lines);
    console.log(" --- Stack Trace Debugging ---");

    const cache: {[name: string]: any} = {};

    for (const line of lines) {
        const file = line.split("/").pop();
        const fileInfo = file.split(":");

        const trace = {
            filename: fileInfo[0],
            lineNumber: parseInt(fileInfo[1]),
            columnNumber: parseInt(fileInfo[2]) || 0
        };

        if (!trace.lineNumber) continue;
        const filename = path.join("dist", trace.filename.substr(0, trace.filename.lastIndexOf(".")) + ".map");
        console.log("getting map from", filename);
        let map: any;
        if (cache[filename]) {
            map = cache[filename];
        } else {
            console.log("reading");
            const source = fs.readFileSync(filename, "utf8");
            console.log("parsing");
            map = JSON.parse(source);
        }
        console.log("done");

        const smc = await new SourceMap.SourceMapConsumer(map);
        const originalPosition = smc.originalPositionFor({
            line: trace.lineNumber,
            column: trace.columnNumber
        });
        console.log(`${originalPosition.name} @ ${originalPosition.source}:${originalPosition.line}:${originalPosition.column} (${trace.filename}:${trace.lineNumber}:${trace.columnNumber}`);
    }
}());