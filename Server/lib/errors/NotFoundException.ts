import Exception from "./Exception";

export default class FileException extends Exception {
    private static _fileCodeMessages = {
        EACCES: "File access permission denied",
        EEXISTS: "File already exists",
        EISDIR: "Expected file, found directory",
        EMFILE: "Too many open files in system",
        ENOENT: "No such file or directory",
        ENOTDIR: "Expected directory, found file",
        ENOTEMPTY: "Directory is not empty",
        EPERM: "File access operation not permitted"
    };

    id: string;

    constructor(id: string, message?: string) {
        super(message || FileException._fileCodeMessages[id]);
        this.id = id;
    }
}