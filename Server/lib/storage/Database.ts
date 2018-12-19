import {Logger} from "../getLogger";
import * as uuidv5 from "uuid/v5";
import Exception from "../errors/Exception";
import NullReferenceException from "../errors/NullReferenceException";
import nameof from "../nameof";
import * as path from "path";
import * as fs from "fs-extra-promise";
import * as store from "json-fs-store";
import Path from "./paths/Path";

const logger = Logger.create("storage/Database");

/**
 * @deprecated
 */
export default class Database {
    // Note: **DO NOT CHANGE THE VALUE**. This will mess up already existing data!
    private static readonly _ns: string = uuidv5("https://ci.zoweb.me", uuidv5.URL);

    private _raw: store;
    private readonly _path: string;
    private readonly _useKeys: boolean;

    private readonly _ns: string;
    private readonly _initUuid: string;

    private _initialised: boolean = false;

    private readonly _uuidTranslationCache: {[uuid: string]: string};

    public name: string;

    private _uuid(name: string) {
        return uuidv5(name, this._ns);
    }

    constructor(name: string, path: string, useKeys: boolean = false) {
        this._raw = store(path);
        this._path = path;

        this._useKeys = useKeys;

        this._ns = uuidv5(name, Database._ns);
        this._initUuid = this._uuid("INTERNAL_DATABASE_INFORMATION");

        this._uuidTranslationCache = {};
        this._uuidTranslationCache[this._initUuid] = "INTERNAL_DATABASE_INFORMATION";

        this.name = name;
    }

    /**
     * Sets a value in the database
     * @param name - Name of the row
     * @param value - Must be serializable
     */
    public set(name: string, value: object): Promise<void> {
        if (!this._initialised) throw new Exception("Database has not been initialised.", "Run `init()` to initialise.");

        const uuid = this._uuid(name);

        return new Promise((yay: (value: any) => void, nay: (error: Error) => void): void => {
            this._raw.add({
                id: uuid,
                data: value
            }, err => {
                if (err) nay(new Error(err));
                else yay(null);
            });
        }).then(() => new Promise(async (yay: (value: any) => void, nay: (error: Error) => void): Promise<void> => {
            let initData = await this.get("INTERNAL_DATABASE_INFORMATION");

            if (initData === null) throw new NullReferenceException(nameof({initData}), "Could not load internal" +
                " database information for `" + this.name + "`");

            initData.lastModified[uuid] = Date.now();
            initData.keys[uuid] = name;

            this._raw.add({
                id: this._initUuid,
                data: initData
            }, err => {
                if (err) nay(new Error(err));
                else yay(null);
            });
        }));
    }

    /**
     * Sets a value in the database, if it does not already exist
     * @param {string} name - The value's key
     * @param {object} def - The default value to set
     * @returns {Promise<boolean>} True if the value was set, false otherwise
     */
    public async def(name: string, def: object): Promise<boolean> {
        if (!this._initialised) throw new Exception("Database has not been initialised.", "Run `init()` to initialise.");

        if (await this.contains(name)) return false;
        await this.set(name, def);
        return true;
    }

    /**
     * Gets the name of a row from its ID. Returns NULL if it doesn't exist
     * @param uuid
     * @returns NULL if the row doesn't exist, the name
     * otherwise.
     */
    public async getName(uuid: string): Promise<string | null> {
        if (!this._initialised) throw new Exception("Database has not been initialised.", "Run `init()` to initialise.");

        if (uuid in this._uuidTranslationCache) return this._uuidTranslationCache[uuid];
        if (uuid === this._initUuid) return "INTERNAL_DATABASE_INFORMATION"; // Just in case it is removed from the
        // cache, because otherwise we'd infinitely look inside that file.

        let {keys} = await this.get("INTERNAL_DATABASE_INFORMATION");

        return keys[uuid] || null;
    }

    /**
     * Gets a value in the database
     * @param name
     * @returns value
     */
    public get(name: string): Promise<any> {
        if (!this._initialised) throw new Exception("Database has not been initialised.", "Run `init()` to initialise.");

        logger.debug(`Getting ${name} from ${this.name}`);
        const uuid = this._uuid(name);

        return new Promise((yay: (value: any) => void) => {
            this._raw.load(uuid, (err: string, data: {data: object}) => {
                if (err) {
                    logger.warn(`Could not find ${name} in ${this.name}`);
                    yay(null);
                }
                else yay(data.data);
            });
        });
    }

    /**
     * Removes a value from the database
     * @param name
     */
    public async remove(name: string): Promise<void> {
        if (!this._initialised) throw new Exception("Database has not been initialised.", "Run `init()` to initialise.");

        const uuid = this._uuid(name);

        await new Promise((yay: (value: any) => void, nay: (error: Error) => void) => {
            this._raw.remove(uuid, (err: string) => {
                if (err) nay(new Error(err));
                else yay(null);
            });
        });

        const initData = await this.get("INTERNAL_DATABASE_INFORMATION");
        if (initData === null) throw new NullReferenceException(nameof({initData}), "Could not load internal" +
            " database information for `" + this.name + "`");

        delete initData.keys[uuid];

        await this.set("INTERNAL_DATABASE_INFORMATION", initData);
    }

    /**
     * Checks if a value in the database contains
     * @param name
     * @returns True if it contains
     */
    public async contains(name: string): Promise<boolean> {
        if (!this._initialised) throw new Exception("Database has not been initialised.", "Run `init()` to initialise.");

        const uuid = this._uuid(name),
            file = path.join(this._path, uuid + ".json"),
            exists = await fs.existsAsync(file);

        logger.debug(`Checking if ${this.name}/${name}exists (${exists}), UUID: ${uuid} and path ${file}`);

        return exists;

        /**return new Promise((yay: (contains: boolean) => void) => {
            fs.contains()
        });

         return new Promise((yay: (value: any) => void) => {
            this._raw.load(uuid, (err: Error) => {
                if (err) yay(false);
                else yay(true);
            })
        });*/
    }

    /**
     * Lists every element in the database.
     * @returns Each file's name
     */
    public async list(): Promise<string[]> {
        if (!this._initialised) throw new Exception("Database has not been initialised.", "Run `init()` to initialise.");

        logger.debug(`Listing keys in ${this.name}`);

        const files: string[] = await fs.readdirAsync(this._path);

        return files.map(file => file.substr(0, file.lastIndexOf(".")));
    }

    /**
     * Gets information from the database. Useful for RESTful APIs.
     */
    public async getCollection(edit: (data?: object) => void = (data?: object) => data): Promise<any> {
        if (!this._initialised) throw new Exception("Database has not been initialised.", "Run `init()` to initialise.");

        // Get the list of files
        let startTime: [number, number] = process.hrtime(), list: string[] = await this.list();

        // Then generate some data about that list
        let data: any = {
            length: 0,
            info: {}
        };

        logger.debug(`List of stuff (as UUIDs): ${list.join(",")}`);

        // Convert list to names
        let idiIndex = -1;
        for (let i = 0; i < list.length; i++) {
            let name = await this.getName(list[i]);
            if (name === null) throw new Error(`Rogue file found in database (i=${i},id=${list[i]},db=${this.name})`);
            list[i] = name;

            if (name === "INTERNAL_DATABASE_INFORMATION") idiIndex = i;
        }

        logger.debug(`List of stuff (as names): ${list.join(",")}`);

        // Remove INTERNAL_DATABASE_INFORMATION
        list.splice(idiIndex, 1);

        if (this._useKeys) {
            data[this.name] = {};
            for (const key of list) {
                data[this.name][key] = await this.get(key);
                data[this.name][key] = await edit(data[this.name][key]);
            }
        } else {
            data[this.name] = [];
            for (let i = 0; i < list.length; i++) {
                data[this.name][i] = await this.get(list[i]);
                data[this.name][i] = await edit(data[this.name][i]);
                data.length++;
            }
        }

        data.info.date = Date.now();

        let endTime: [number, number] = process.hrtime(startTime);
        data.info["gen-time"] = (endTime[0] * 1e9 + endTime[1]) / 1e6;

        return data;
    }

    /**
     * Initialises the table
     */
    public async init(): Promise<void> {
        this._initialised = true;

        // Don't initialise if we have already
        if (await this.contains("INTERNAL_DATABASE_INFORMATION")) {
            logger.debug(`Didn't initialise ${this.name}, as it is already initialised.`);
            return;
        }

        logger.debug(`Initialising ${this.name} at ${this._path}`);
        await this.set("INTERNAL_DATABASE_INFORMATION", {
            hrtime: process.hrtime(),
            keys: {},
            lastModified: {}
        });
    }
}