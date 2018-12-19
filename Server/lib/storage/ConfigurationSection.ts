import Path from "./paths/Path";
import {Stringifyable} from "../Stringifyable";
import {Logger} from "../getLogger";

const logger = Logger.create("storage/ConfigurationSection");

export default abstract class ConfigurationSection {
    rootPath: Path;

    protected constructor(rootPath: Path | String) {
        if (typeof rootPath === "string") {
            this.rootPath = new Path(rootPath);
        } else {
            this.rootPath = rootPath as Path;
        }
    }

    protected abstract getData(path: Path): Promise<Stringifyable>;
    protected abstract setData(path: Path, value: Stringifyable): Promise<void>;
    abstract remove(path: Path | string): Promise<void>;
    abstract checkContains(path: Path): Promise<boolean>;
    abstract size(path: Path | string): Promise<number>;
    abstract get(path: Path | string): ConfigurationSection;

    private async tryGetData(path: Path): Promise<Stringifyable> {
        logger.trace("Get data from path:", path.toString());
        let data = await this.getData(path);
        if (typeof data === "undefined") throw new ReferenceError(`Could not find '${path}'`);
        return data;
    }

    async getString(path: string | Path): Promise<string> {
        let joined = this.rootPath.append(path);
        let data = await this.tryGetData(joined);
        if (data === null) return null;
        if (typeof data !== "string") throw new TypeError(`Expected 'string' from '${joined}', found '${typeof data}'`);
        return data;
    }

    async getNumber(path: string | Path): Promise<number> {
        let joined = this.rootPath.append(path);
        let data = await this.tryGetData(joined);
        if (data === null) return null;
        if (typeof data !== "number") throw new TypeError(`Expected 'number' from '${joined}', found '${typeof data}'`);
        return data;
    }

    async getBoolean(path: string | Path): Promise<boolean> {
        let joined = this.rootPath.append(path);
        let data = await this.tryGetData(joined);
        if (data === null) return null;
        if (typeof data !== "boolean") throw new TypeError(`Expected 'boolean' from '${joined}', found '${typeof data}'`);
        return data;
    }

    async getObject(path: string | Path): Promise<Object> {
        let joined = this.rootPath.append(path);
        let data = await this.tryGetData(joined);
        if (data === null) return null;
        if (typeof data !== "object") throw new TypeError(`Expected 'object' from '${joined}', found '${typeof data}'`);
        return data;
    }

    async getArray<T>(path: string | Path): Promise<Array<T>> {
        let joined = this.rootPath.append(path);
        let data = await this.tryGetData(joined);
        if (data === null) return null;
        if (!(data instanceof Array)) throw new TypeError(`Expected array from '${joined}', found '${typeof data}'`);
        return data;
    }

    getAny(path: string): Promise<Stringifyable> {
        const joined = this.rootPath.append(path);
        return this.tryGetData(joined);
    }

    set(path: string | Path, value: Stringifyable = ""): Promise<void> {
        const joined = this.rootPath.append(path);
        logger.trace("Set data at path", joined.toString());
        return this.setData(joined, value);
    }

    contains(path: string | Path): Promise<boolean> {
        const joined = this.rootPath.append(path);
        logger.trace("Checking if data at", joined.toString(), "exists");
        return this.checkContains(joined);
    }
}