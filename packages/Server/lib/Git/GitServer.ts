import {EventEmitter} from "events";
import {Logger} from "../getLogger";
import ParameterException from "../errors/ParameterException";
import nameof from "../nameof";
import * as path from "path";
import {
    copyAsync,
    existsAsync,
    mkdirpAsync,
    moveAsync,
    readdirAsync, readFileAsync,
    statAsync,
    writeFileAsync
} from "fs-extra-promise";
import ServiceRequestData from "./ServiceRequestData";
import {exec, spawn} from "child_process";
import Exception from "../errors/Exception";
import BranchListItem from "./BranchListItem";

const gitlog = require("gitlog");

const logger = Logger.create("Git/GitServer");

export default class GitServer extends EventEmitter {
    private static _validNameRegex = /^[a-z][a-z0-9_-]{2,}\.git$/i;

    public static getRepositoryName(name: string = ""): string {
        name = name.toLowerCase();
        if (!name.endsWith(".git")) name += ".git";
        if (!this._validNameRegex.test(name)) throw new ParameterException(this._validNameRegex.toString(), name, nameof({name}));
        return name;
    }

    public repos: string[] = [];
    public dataDirectory: string = null;
    public setupDirectory: string = null;

    async setDataDirectory(newDirectory: string): Promise<void> {
        newDirectory = path.resolve(newDirectory);

        logger.debug("Setting repository directory to", newDirectory, "from", this.dataDirectory);

        if (newDirectory === this.dataDirectory) return;

        if (await existsAsync(newDirectory)) {
            if (!(await statAsync(newDirectory)).isDirectory()) {
                throw new ParameterException("Directory", "File", nameof({newDirectory}), "Data directory must be a" +
                    " directory");
            }
        } else {
            await mkdirpAsync(newDirectory);
        }

        logger.debug("Moving data from old directory to new one");
        const oldDirectory = this.dataDirectory;
        this.dataDirectory = newDirectory;

        if (oldDirectory === null) {
            // No point copying it as we hadn't done anything yet
            logger.debug("Skipping move stage");
            return;
        }

        await moveAsync(oldDirectory, newDirectory);
    }

    async setSetupDirectory(newDirectory: string): Promise<void> {
        newDirectory = path.resolve(newDirectory);

        logger.debug("Setting repository directory to", newDirectory, "from", this.setupDirectory);

        if (newDirectory === this.setupDirectory) return;

        if (await existsAsync(newDirectory)) {
            if (!(await statAsync(newDirectory)).isDirectory()) {
                throw new ParameterException("Directory", "File", nameof({newDirectory}), "Data directory must be a" +
                    " directory");
            }
        } else {
            await mkdirpAsync(newDirectory);
        }

        logger.debug("Moving data from old directory to new one");
        const oldDirectory = this.setupDirectory;
        this.setupDirectory = newDirectory;

        if (oldDirectory === null) {
            // No point copying it as we hadn't done anything yet
            logger.debug("Skipping move stage");
            return;
        }

        await moveAsync(oldDirectory, newDirectory);
    }

    async createRepository(name: string): Promise<boolean> {
        logger.info("Starting creation of repository:", name);

        const repoName = GitServer.getRepositoryName(name);
        const hasName = typeof repoName === "string" && repoName.length > 4;
        const hasCorrectName = hasName && !/ /.test(repoName) && !/%/.test(repoName) && !/"/.test(repoName);
        const exists = await this.repositoryExists(repoName);

        if (!hasName) throw new Exception("Repository name is not long enough");
        if (!hasCorrectName) throw new Exception("Repository has bad name");
        if (exists) throw new Exception("Repository already exists");

        logger.debug("Creating repository directory");
        const repoDir = path.join(this.dataDirectory, repoName);
        await mkdirpAsync(repoDir);

        logger.debug("Cloning empty repository");
        await copyAsync(path.join(this.setupDirectory, "default"), repoDir);

        // Set repo name
        await writeFileAsync(path.join(repoDir, "description"), repoName.substring(0, repoName.length - 4));

        return true;
    }

    async repositoryExists(name: string): Promise<boolean> {
        const repoList: string[] = [];

        name = GitServer.getRepositoryName(name);

        const temporaryRepoList = await readdirAsync(this.dataDirectory);
        for (const dir of temporaryRepoList) {
            repoList.push(dir);
        }

        for (const repoName of this.repos) {
            if (repoList.indexOf(repoName) === -1) repoList.push(repoName);
        }

        // update list
        this.repos = repoList;

        return this.repos.some(repo => repo === name);
    }

    async listRepositories(): Promise<string[]> {
        const repoList: string[] = [];
        const temporaryRepoList = await readdirAsync(this.dataDirectory);
        for (const dir of temporaryRepoList) {
            repoList.push(dir);
        }

        for (const repoName of this.repos) {
            if (repoList.indexOf(repoName) === -1) repoList.push(repoName);
        }

        // update list
        this.repos = repoList;

        return this.repos;
    }

    sendService(request: ServiceRequestData) {
        logger.debug("Sending service:", request.service);

        const {
            request: req,
            response: res,

            service,

            repoCombinedPath: repoCombined,
            repoRootPath: repoRoot,
            repoPath: repo,
            fullPath: full
        } = request;

        // Disable caching
        res.setHeader("Expires", "Fri, 01 Jan 1980 00:00:00 GMT");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");

        // Set Git content type
        res.setHeader("Content-Type", `application/x-${service}-advertisement`);

        // THe init packet to send
        const packet = `# service=${service}\n`;
        const length = packet.length + 4, hex = "0123456789abcdef";
        let prefix = hex.charAt((length >> 12) & 0xf);
        prefix += hex.charAt((length >> 8) & 0xf);
        prefix += hex.charAt((length >> 4) & 0xf);
        prefix += hex.charAt((length >> 0) & 0xf);

        // Write init packet
        res.write(`${prefix}${packet}0000`);

        // Start process
        const serviceLocation = path.join(this.setupDirectory, service + ".cmd");
        const ps = spawn(serviceLocation, ["--stateless-rpc", "--advertise-refs", repoRoot]);
        ps.stdout.pipe(res);

        logger.debug("Data inspection:");
        ps.stdout.pipe(process.stdout);
        req.pipe(process.stdin);

        ps.stderr.on("data", data => logger.warn(`Git ${service} STDERR:`, data.toString()));
        ps.on("exit", () => {
            res.end();
            this.emit(service, {
                repo
            });
            logger.debug("Finished git service:", service);
        });
    }

    sendRecievePack(request: ServiceRequestData, name: string) {
        const {
            request: req,
            response: res,

            service,

            repoCombinedPath: repoCombined,
            repoRootPath: repoRoot,
            repoPath: repo,
            fullPath: full
        } = request;
        logger.debug("Sending recieve pack");

        // Disable caching
        res.setHeader("Expires", "Fri, 01 Jan 1980 00:00:00 GMT");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");

        // Set Content-Type
        res.setHeader("Content-Type", "application/x-git-receive-pack-result");

        // Start the process
        const serviceLocation = path.join(this.setupDirectory, "git-receive-pack.cmd");
        logger.debug("Starting", serviceLocation, "for", repoRoot);
        const ps = spawn(serviceLocation, ["--stateless-rpc", repoRoot]);
        req.pipe(ps.stdin);
        ps.stdout.pipe(res);

        logger.debug("Data inspection:");
        ps.stdout.pipe(process.stdout);
        req.pipe(process.stdin);

        ps.stderr.on("data", data => logger.warn(`Git receive pack STDERR:`, data.toString()));
        ps.on("exit", () => {
            console.log("");
            logger.debug("Finished sending receive pack");
            this.emit("git-receive-pack", {
                name,
                repo
            });
        });
    }

    sendUploadPack(request: ServiceRequestData, name: string) {
        const {
            request: req,
            response: res,

            service,

            repoCombinedPath: repoCombined,
            repoRootPath: repoRoot,
            repoPath: repo,
            fullPath: full
        } = request;
        logger.debug("Sending upload pack");

        // Disable caching
        res.setHeader("Expires", "Fri, 01 Jan 1980 00:00:00 GMT");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");

        // Set content-type
        res.setHeader("Content-Type", "application/x-git-upload-pack-result");

        res.setHeader("Connection", "close");

        // Start the process
        const serviceLocation = path.join(this.setupDirectory, "git-upload-pack.cmd");
        logger.debug("Starting", serviceLocation, "for", repoRoot);
        const ps = spawn(serviceLocation, ["--stateless-rpc", repoRoot]);
        req.pipe(ps.stdin);
        ps.stdout.pipe(res);

        logger.debug("Data inspection:");
        ps.stdout.pipe(process.stdout);

        ps.stderr.on("data", data => logger.warn(`Git receive pack STDERR:`, data.toString()));
        ps.on("exit", () => {
            console.log("");
            logger.debug("Finished sending upload pack");
            this.emit("git-upload-pack", {
                name,
                repo
            });
        });
    }

    getRepositoryLog(repoName: string, branch?: string): Promise<GitLogResponse[]> {
        repoName = GitServer.getRepositoryName(repoName);
        const fullDirectory = path.join(this.dataDirectory, repoName);

        logger.debug("Getting data from Git log");
        return new Promise((yay, nay) => {
            gitlog({
                repo: fullDirectory,
                branch,
                fields: [
                    "abbrevHash",
                    "hash",
                    "subject",
                    "authorName",
                    "authorDate"
                ]
            }, (err, commits) => {
                if (err) nay(err);
                else yay(commits);
            });
        });
    }

    async getBranchList(repoName: string): Promise<BranchListItem[]> {
        repoName = GitServer.getRepositoryName(repoName);
        const fullDirectory = path.join(this.dataDirectory, repoName);
        const progDirectory = path.join(this.setupDirectory, "git-prog.cmd");

        logger.debug("Getting branch list for", repoName);

        const child = exec(`${progDirectory} branch --no-color -v --no-abbrev --format "%(HEAD)\t%(refname:short)\t%(objectname)\t%(upstream:track,nobracket)"`, {
            cwd: fullDirectory
        });

        let data = "";
        child.stdout.on("data", dat => data += dat);

        await new Promise(yay => child.stdout.on("end", yay));

        const list = [];

        for (let branch of data.substr(0, data.lastIndexOf("\n")).split("\n")) {
            const [isCurrentBranch, branchName, latestCommit, distanceFromRemote] = branch.split("\t");

            logger.debug("Result:", isCurrentBranch, branchName, latestCommit, distanceFromRemote);

            const [behind, ahead] = distanceFromRemote.split(", ");
            const behindNumber = parseInt((behind || "").substr(0, "behind ".length)) || 0;
            const aheadNumber = parseInt((ahead || "").substr(0, "ahead ".length)) || 0;

            const item = new BranchListItem(
                isCurrentBranch === "*",
                branchName,
                latestCommit,
                behindNumber,
                aheadNumber
            );

            list.push(item);
        }

        return list;
    }

    async readFile(repoName: string, fileHash: string, fileName: string) {
        repoName = GitServer.getRepositoryName(repoName);
        const fullDirectory = path.join(this.dataDirectory, repoName);
        const progDirectory = path.join(this.setupDirectory, "git-prog.cmd");

        logger.debug("Reading file from", fileHash || "the latest version", "in", repoName);

        fileHash = fileHash.replace(/"/, "\\\"");
        fileName = fileName.replace(/"/, "\\\"");

        const child = exec(`${progDirectory} show "${fileHash}:${fileName}"`, {
            cwd: fullDirectory,
            encoding: "binary"
        });

        let data = "";

        child.stdout.on("data", dat => data += dat);

        await new Promise(yay => child.stdout.on("end", yay));
        logger.debug("Process has exited.");

        return data;
    }

    async getLastModifiedHash(repositoryName: string, repositoryPath: string) {
        const files = await this.getRepositoryStructure(repositoryName, repositoryPath);

        return files.find(it => it.fullPath === repositoryPath).logData.abbrevHash;
    }

    async getRepositoryStructure(repoName: string, repoPath: string) {
        console.debug("Repo info:", {
            repoName,
            repoPath
        });

        const files = await this.getRepositoryLog(repoName);

        files.reverse();

        const fileMap: {[fileName: string]: GitLogResponse} = {};
        for (const log of files) {
            for (const file of log.files) {
                fileMap[file] = log;
            }
        }

        const everyFileList = Object.keys(fileMap).map(key => ({
            fileName: key,
            logData: fileMap[key]
        }));

        // remove things that aren't in this directory
        const localFileList = everyFileList
            .filter(it => it.fileName.startsWith(repoPath))
            .map(it => ({
                fileName: it.fileName.substr(repoPath.length),
                fullPath: it.fileName,
                logData: it.logData
            }));

        const fileList = localFileList.map(it => ({
            fileName: it.fileName,
            fullPath: it.fullPath,
            logData: it.logData,
            type: "file"
        })).filter(it => it.fileName.indexOf("/") === -1);

        const folderList = localFileList.map(it => ({
            fileName: it.fileName.slice(0, it.fileName.indexOf("/") + 1),
            fullPath: it.fullPath,
            logData: it.logData,
            type: "dir"
        })).filter(it => it.fileName.indexOf("/") > -1).reverse();

        const uniqueFolderList = folderList.filter((value, index) =>
            folderList.findIndex((it => it.fileName === value.fileName)) === index
        );

        return fileList.concat(uniqueFolderList);
    }

    getRepositoryName(assumedName: string) {
        const repoName = GitServer.getRepositoryName(assumedName);
        const repoDescriptionPath = path.join(this.dataDirectory, repoName, "description");

        return readFileAsync(repoDescriptionPath, "utf8");
    }
}

interface GitLogResponse {
    // Commit hash
    hash: string;

    // Commit status
    status: string[];

    // Files updated in commit
    files: string[];

    // Abbreviated version of the hash
    abbrevHash: string;

    // Commit subject
    subject: string;

    // Name of the author
    authorName: string;

    // The author's email
    authorEmail: string;

    // The body content of the commit
    body: string;

    // The date the commit was originally made
    authorDate: string;
}