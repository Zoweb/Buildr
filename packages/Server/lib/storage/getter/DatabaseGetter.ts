import ConfigurationSection from "../ConfigurationSection";
import Path from "../paths/Path";
import {Stringifyable} from "../../Stringifyable";
import ArrayPathSection from "../paths/ArrayPathSection";
import DictionaryPathSection from "../paths/DictionaryPathSection";
import {
    existsAsync,
    mkdirpAsync, readdirAsync,
    readFileAsync,
    removeAsync,
    writeFileAsync
} from "fs-extra-promise";
import * as Paths from "path";
import {Logger} from "../../getLogger";

const logger = Logger.create("storage/getter/DatabaseGetter");

export default class DatabaseGetter extends ConfigurationSection {
    private readonly root: string;

    private async getFilePath(path: Path) {
        let filePath = [this.root, ...path.structure.map(it => {
            if (it instanceof ArrayPathSection) return it.index.toString();
            if (it instanceof DictionaryPathSection) return it.key;
        })];

        // loop through backwards to check for existing files
        for (let i = path.structure.length; i > 0; i--) {
            const currentPath = Paths.join(...filePath.slice(0, 1 + i)) + ".json";

            if (await existsAsync(currentPath)) {
                return {
                    path: currentPath,
                    missedPaths: path.structure.slice(i)
                };
            }
        }

        return {
            path: Paths.join(...filePath) + ".json",
            missedPaths: path.structure
        };
    }

    protected async getData(path: Path): Promise<Stringifyable> {
        const filePath = await this.getFilePath(path);
        logger.trace("Getting data from", filePath);
        if (!await existsAsync(filePath.path)) return void 0;
        const data = JSON.parse(await readFileAsync(filePath.path, "utf8")).value;
        const result = filePath.missedPaths.reduce((prev, curr) => curr.getFrom(prev), data);
        logger.trace("Type of result:", typeof result, "(", result, ")");

        // check if this is an environment variable
        if (result && result.type === "env") {
            logger.trace("Getting data from environment variable,", result.variable);
            if (typeof result.variable !== "string") throw new TypeError("Environment option must have `variable` key");
            const variableName = result.variable;
            let value = process.env[variableName];
            if (typeof value === "undefined") {
                logger.trace("Value did not exist, getting default");
                value = result.default;
            }
            return value;
        }

        return result;
    }

    protected async setData(path: Path, value: Stringifyable): Promise<void> {
        const filePath = Paths.join(this.root, path.structure.map(it => {
            if (it instanceof ArrayPathSection) return it.index;
            if (it instanceof DictionaryPathSection) return it.key;
        }).join("/"));
        const folders = filePath.substr(0, filePath.lastIndexOf(Paths.sep));

        await mkdirpAsync(folders);

        logger.trace("Attempting to write to", filePath + ".json");
        await writeFileAsync(filePath + ".json", JSON.stringify({
            value
        }));
    }

    constructor(root: string, rootPath: Path | string = "") {
        super(rootPath);

        this.root = root;
    }

    async remove(path: Path | string) {
        if (typeof path === "string") path = new Path(path);

        const filePath = Paths.join(this.root, ...path.structure.map(it => {
            if (it instanceof ArrayPathSection) return it.index.toString();
            if (it instanceof DictionaryPathSection) return it.key;
        }));

        if (await existsAsync(filePath)) await removeAsync(filePath);
        if (await existsAsync(filePath + ".json")) await removeAsync(filePath + ".json");
    }


    async checkContains(path: Path | string): Promise<boolean> {
        if (typeof path === "string") path = new Path(path);

        const filePath = Paths.join(this.root, path.structure.map(it => {
            if (it instanceof ArrayPathSection) return it.index;
            if (it instanceof DictionaryPathSection) return it.key;
        }).join("/"));

        console.log("Checking if file exists:", filePath);
        return await existsAsync(filePath) || await existsAsync(filePath + ".json");
    }

    async size(): Promise<number> {
        return (await readdirAsync(this.root)).length;
    }

    async list(): Promise<string[]> {
        return await readdirAsync(this.root).map(it => it.endsWith(".json") ? it.substr(0, it.length - ".json".length) : it);
    }

    get(path: Path | string): ConfigurationSection {
        return new DatabaseGetter(this.root, this.rootPath.append(path));
    }
}