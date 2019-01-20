import * as crypto from "crypto";
import {Logger} from "./getLogger";
import Exception from "./errors/Exception";
import NodeSocket from "./socket/NodeSocket";
import InvalidRequestException from "./errors/InvalidRequestException";
import {Stringifyable} from "./Stringifyable";
import {readFileAsync} from "fs-extra-promise";
import getResource from "./storage/getResource";
import {gitDb, gitServer, languagesDb, optionsDb, setDatabases, usersDb} from "./static";
import * as connect from "connect";
import * as http from "http";
import * as url from "url";
import AuthenticationException from "./errors/AuthenticationException";
import GitServer from "./Git/GitServer";
import * as path from "path";
import AuthenticatedSocket from "./socket/AuthenticatedSocket";
import * as mime from "mime";
import * as mmmagic from "mmmagic";
import {
    RepositoryCreate, RepositoryFileContents,
    RepositoryGetFiles, RepositoryGetName, RepositoryList,
    Resource,
    UsernameFieldUpdate
} from "./responder-types";
import {
    AuthenticationIsValidCurrentAction,
    AuthenticationIsValidOtherAction, AuthenticationSendEmailAction,
    AuthenticationUnauthAction, emailAuthState, userState
} from "./actions/user-actions";
import {IncomingMessage, ServerResponse} from "http";

const logger = Logger.create("index");
logger.info("Starting up server");

const app = connect();

function randomBytes(size: number) {
    return crypto.randomBytes(size).toString("hex");
}

function checkObjectKeys(data: Stringifyable, keys: string[]) {
    const objectKeys = Object.keys(data);
    return keys.every(it => objectKeys.indexOf(it) !== -1);
}

const run = async function() {
    await setDatabases();
    // load configuration
    const configText = (await readFileAsync("configuration.json")).toString();
    const config = JSON.parse(configText);
    for (const key of Object.keys(config)) {
        await optionsDb.set(key, config[key]);
    }

    // start http server
    const httpServer = app.listen(parseInt(await optionsDb.getString("host.backend.port.private")));

    app.use("/action/login", async (req: http.IncomingMessage, res: http.ServerResponse) => {
        const urlParsed = url.parse(req.url, true);
        checkObjectKeys(urlParsed.query, ["id"]);

        logger.debug("Got login action with id:", urlParsed.query["id"]);

        const stateId = urlParsed.query.id;
        if (typeof stateId !== "string") throw new Exception("Magic code must be a string");

        if (!emailAuthState.contains(stateId)) {
            res.end("Invalid magic link.");
            return;
        }

        const state = emailAuthState.get(stateId);
        emailAuthState.remove(stateId);

        const client = state.client;

        const user = await usersDb.getUser(state["email"]);
        if (!user.isRegistered) await user.resetPermissions();

        const authCode = userState.create(user);

        client.send("authentication:recv-email", {
            authCode
        });

        res.end("You can close this tab.");
    });

    app.use("/repository/", async (req: IncomingMessage, res: ServerResponse, next: Function) => {
        logger.info("Request at:", req.url);

        const accessUrl = url.parse(req.url, true);


        const pathSplit = accessUrl.pathname.split("/").slice(1);

        logger.debug("Doing repository magic from", pathSplit);

        const repoName = GitServer.getRepositoryName(pathSplit[0]);
        let repoPath = pathSplit.slice(1).join("/");

        if (repoPath.startsWith("/.git")) repoPath = repoPath.substr("/.git".length);

        if (!await gitServer.repositoryExists(repoName)) {
            res.writeHead(404);
            res.end("Repository not found.");
            return;
        }

        const repoPathCombined = path.join(repoName, repoPath),
            repoRootDir = path.join(gitServer.dataDirectory, repoName),
            fullPath = path.join(gitServer.dataDirectory, repoPathCombined);
        logger.debug("Paths:", repoName, repoPath, repoPathCombined, repoRootDir, fullPath);

        if (repoPath === "info/refs" && accessUrl.query && accessUrl.query.service) {
            if (["git-receive-pack", "git-upload-pack"].indexOf(accessUrl.query.service as string) === -1) {
                res.writeHead(400);
                return res.end("Invalid service pack.");
            }

            gitServer.sendService({
                request: req,
                response: res,

                service: accessUrl.query.service as string,

                repoCombinedPath: repoPathCombined,
                repoRootPath: repoRootDir,
                repoPath,
                fullPath
            });
            return;
        }

        if (repoPath === "git-receive-pack") {
            gitServer.sendRecievePack({
                request: req,
                response: res,

                service: accessUrl.query.service as string,

                repoCombinedPath: repoPathCombined,
                repoRootPath: repoRootDir,
                repoPath,
                fullPath
            }, repoName);
            return;
        }

        if (repoPath === "git-upload-pack") {
            gitServer.sendUploadPack({
                request: req,
                response: res,

                service: accessUrl.query.service as string,

                repoCombinedPath: repoPathCombined,
                repoRootPath: repoRootDir,
                repoPath,
                fullPath
            }, repoName);
            return;
        }

        //%resource=config:host.backend.protocol%://%resource=config:host.backend.name%:%resource=config:host.backend.port.public%/action/login?id=%loginId%

        res.writeHead(400);
        res.write(`To view the repository on ${await optionsDb.getString("global.title")}, go to the URL below:\n`);
        res.write(await optionsDb.getString("host.frontend.protocol"));
        res.write("//");
        res.write(await optionsDb.getString("host.frontend.name"));
        res.write(":");
        res.write((await optionsDb.getNumber("host.frontend.port.public")).toString());
        res.write("/repository.html#");
        res.write(repoName);
    });

    app.use("/rawrepo/", async (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
        logger.info("Request at:", req.url);

        const accessUrl = url.parse(req.url);

        const path = accessUrl.pathname.substr(1);

        logger.debug("Reading repository file at", path);

        const repositoryName = path.substr(0, path.indexOf("/")),
            repositoryPath = path.substr(repositoryName.length + 1);

        logger.trace("Repo name:", repositoryName);
        logger.trace("Repo path:", repositoryPath);

        try {
            const fileLastModified = await gitServer.getLastModifiedHash(repositoryName, repositoryPath);
            const fileContents = await gitServer.readFile(repositoryName, fileLastModified, repositoryPath);

            // get mime type
            const extension = path.split(".").pop();
            let mimeType: string;
            if (extension) {
                mimeType = mime.getType(extension);
            } else {
                const magic = new mmmagic.Magic(mmmagic.MAGIC_MIME_TYPE | mmmagic.MAGIC_MIME_ENCODING);
                mimeType = await new Promise((yay, nay) =>
                    magic.detect(Buffer.from(fileContents), (err, result: string) => {
                    if (err) nay(err);
                    else yay(result);
                })) as string;
            }

            if (mimeType === "text/markdown")
                mimeType = "text/plain";

            res.setHeader("Content-Type", mimeType);
            res.end(fileContents);
        } catch (ex) {
            res.writeHead(404, "File Not Found");
            res.end("Could not find file or repository.");
        }
    });

    // start socket server
    const server = new NodeSocket({
        server: httpServer
    }, client => {
        const authClient = new AuthenticatedSocket(client, userState);

        logger.debug("Got new client from", client.ip);

        // Authentication methods
        AuthenticationIsValidCurrentAction.setupResponseMethod(authClient);
        AuthenticationIsValidOtherAction.setupResponseMethod(authClient);
        AuthenticationUnauthAction.setupResponseMethod(authClient);
        AuthenticationSendEmailAction.setupResponseMethod(authClient);

        client.respond("authentication:root.set-email", async data => {
            if (!checkObjectKeys(data, ["email"])) throw new InvalidRequestException("authentication:root.set-email");
            if (await usersDb.contains("root")) throw new InvalidRequestException("authentication:root.set-email", "Root already exists");

            const user = await usersDb.getRootUser();
            await user.getter.set("email", data["email"]);
            await user.givePermission("*"); // WARNING root can do ANYTHING!!

            return {
                success: true
            };
        });

        client.respond("user:exists", async data => {
            if (!checkObjectKeys(data, ["email"])) throw new InvalidRequestException("user:exists");

            return (await usersDb.getUser(data["email"])).isRegistered || false;
        });

        authClient.respond(UsernameFieldUpdate, "user:update:username", async (user, data) => {
            const targetUser = data["targetEmail"] || user.email;

            let hasPermission: boolean;
            if (targetUser === user.email) hasPermission = await user.hasPermission("username.change.me");
            else hasPermission = await user.hasPermission("username.change.others");

            if (!hasPermission) throw new AuthenticationException("Not enough permissions");

            const targetUserInstance = await usersDb.getUser(targetUser);
            targetUserInstance.username = data["username"];
            targetUserInstance.isRegistered = true;
            await targetUserInstance.save();

            return {
                success: true
            }
        });

        client.respond("user:count", async () => await usersDb.size());

        authClient.respondWithPermission(RepositoryCreate, "repository:create", "git.repo.create", async (user, data) => {
            const success = await gitServer.createRepository(data["name"]);
            if (!success) return {success};

            const section = gitDb.get(data["name"]);
            await section.set("creator", user.email);
            await section.set("creation-date", Date.now());
            await section.set("issues", []);
            await section.set("releases", []);

            return {success};
        });

        authClient.respond(RepositoryGetFiles, "repository:get-files", async (user, data) => {
            const repoOwner = await gitDb.get(data["repoName"]).getString("creator");

            if (repoOwner === user.email && !await user.hasPermission("git.repo.mine.read")) throw new AuthenticationException("Not enough permissions");
            if (repoOwner !== user.email && !await user.hasPermission("git.repo.others.read")) throw new AuthenticationException("Not enough permissions");

            // get source files of repository
            return {
                files: await gitServer.getRepositoryLog(data["repoName"])
            };
        });

        authClient.respond(RepositoryFileContents, "repository:file-contents", async (user, data) => {
            const repoOwner = await gitDb.get(data["repository"]).getString("creator");

            if (repoOwner === user.email && !await user.hasPermission("git.repo.mine.read")) throw new AuthenticationException("Not enough permissions");
            if (repoOwner !== user.email && !await user.hasPermission("git.repo.others.read")) throw new AuthenticationException("Not enough permissions");

            return {
                contents: await gitServer.readFile(data["repository"], data["hash"], data["file"])
            }
        });

        authClient.respondWithoutUserCheck(RepositoryGetName, "repository:get-name", async (authCode, data) => {
            return await gitServer.getRepositoryName(data["assumedName"])
        });

        authClient.respondWithoutUserCheck(RepositoryList, "repository:list", (authCode, data) => {
            return gitServer.listRepositories();
        });

        authClient.respondWithoutUserCheck(Resource, "resource", (authCode, data) => {
            return getResource(data["path"], {
                lang: languagesDb,
                config: optionsDb
            });
        });

        client.onAny((event, data, requestId) => {
            if (event === "handshake") return; // fills up console
            logger.debug(`Event: ${requestId}: ${event}:`, data);
        });
    });
};

run().catch(err => {throw err});

process.on("unhandledRejection", (err: Error | string) => {
    if (!(err instanceof Error)) err = new Error(err);
    logger.error(err, err instanceof Exception ? `An error occurred (extra data: ${err.info})` : "An error occurred");
});
process.on("uncaughtException", (err: Error | string) => {
    if (!(err instanceof Error)) err = new Error(err);
    logger.error(err, err instanceof Exception ? `An error occurred (extra data: ${err.info})` : "An error occurred");
});
process.on("warning", (warning: Error | string) => {
    if (typeof warning !== "string") warning = `${warning.name}: ${warning.message}`;
    logger.warn(`Warning: ${warning}`);
});