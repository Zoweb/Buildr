import {spawn} from "child_process";

export default function readCommandOutput(path: string, args: string[]) {
    const child = spawn(path, args);

    let stdOut = "";
    child.stdout.on("data", buff => {
        stdOut += buff.toString();
    });

    return new Promise(yay => child.stdout.on("end", () => yay(stdOut)));
}