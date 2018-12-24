import * as path from "path";
import * as fs from "fs-extra-promise";
import {Logger} from "../getLogger";
import DatabaseGetter from "./getter/DatabaseGetter";
import UserGetter from "./getter/UserGetter";
import {existsAsync, mkdirsAsync, mkdirsSync} from "fs-extra-promise";
import {existsSync} from "fs";

const logger = Logger.create("storage/DatabaseManager");

export default class DatabaseManager {
    public static Instance: DatabaseManager;

    public static getDatabasePathname(name_pathname: string): string {
        name_pathname = name_pathname.toLowerCase();
        if (!/\.db$/.test(name_pathname)) {
            name_pathname += ".db";
        }
        return name_pathname;
    }

    public static getDatabaseName(name_pathname: string): string {
        name_pathname = name_pathname.toLowerCase();
        if (/\.db$/.test(name_pathname)) {
            name_pathname = name_pathname.substr(0, name_pathname.length - ".db".length);
        }
        return name_pathname;
    }

    public dataDirectory: string = null;

    public constructor() {
        if (DatabaseManager.Instance) logger.warn("Multiple database instances are in use!");
        DatabaseManager.Instance = this;
    }

    public async setDataDirectory(directory: string): Promise<void> {
        // First convert directory to absolute
        directory = path.resolve(directory);

        logger.debug(`Setting database directory to ${directory}, where current directory is ${__dirname}`);

        // If data directory is the same, no point running
        if (directory === this.dataDirectory) {
            return;
        }

        let directoryExists: boolean = await fs.existsAsync(directory);

        if (directoryExists) {
            // Check if the directory is a folder
            if (!(await fs.statAsync(directory)).isDirectory()) {
                return;
            }
        } else {
            // Actually make the directory
            await fs.mkdirsAsync(directory);
        }

        logger.debug("Cloning old directory");
        let oldDataDirectory: string = this.dataDirectory;
        if (oldDataDirectory === null) {
            // No point copying as this is the first time setting the directory.
            this.dataDirectory = directory;
            return;
        }

        logger.debug("Copying from old data directory");
        await fs.copyAsync(oldDataDirectory, directory);
    }

    public getDatabase(name: string): DatabaseGetter {
        name = DatabaseManager.getDatabasePathname(name);
        logger.debug(`Loading database, named ${name}`);

        let pathName = path.join(this.dataDirectory, name);
        logger.debug(`Directory is ${pathName} (root directory is ${this.dataDirectory})`);

        if (!existsSync(pathName)) mkdirsSync(pathName);

        return new DatabaseGetter(pathName);
    }

    getUserDatabase(name: string) {
        // same as getDatabase, but gets a UserGetter
        name = DatabaseManager.getDatabasePathname(name);
        logger.debug("Loading database, named", name);

        const pathName = path.join(this.dataDirectory, name);
        logger.debug("Directory is", pathName, "( root directory is", this.dataDirectory, ")");

        if (!existsSync(pathName)) mkdirsSync(pathName);

        return new UserGetter(pathName);
    }
}