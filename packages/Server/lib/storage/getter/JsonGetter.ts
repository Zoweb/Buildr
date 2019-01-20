import ConfigurationSection from "../ConfigurationSection";
import Path from "../paths/Path";
import DictionaryPathSection from "../paths/DictionaryPathSection";
import ArrayPathSection from "../paths/ArrayPathSection";
import {readFileAsync} from "fs-extra-promise";
import {Stringifyable} from "../../Stringifyable";

export default class JsonGetter extends ConfigurationSection {
    static async fromFile(path: string) {
        return new JsonGetter(await readFileAsync(path, "utf8"));
    }

    private readonly source: Stringifyable;

    getData(path: Path): Promise<Stringifyable> {
        return Promise.resolve(path.structure.reduce((obj, part) => {
            if (part instanceof DictionaryPathSection) return obj[part.key];
            if (part instanceof ArrayPathSection) return obj[part.index];
        }, this.source));
    }

    setData(path: Path, value: Stringifyable): Promise<void> {
        let pathEl: Stringifyable = this.source;

        for (const el of path.structure.slice(0, path.structure.length - 1)) {
            pathEl = el.getFrom(pathEl) || {};
        }

        path.structure.slice(-1)[0].setFrom(pathEl, value);

        return Promise.resolve();
    }

    constructor(source: Stringifyable, rootPath: Path | string = "") {
        super(rootPath);
        this.source = source;
    }

    checkContains(path: Path): Promise<boolean> {
        return new Promise(yay => yay(typeof this.getData(path) !== "undefined"));
    }

    get(path: Path | string): ConfigurationSection {
        return new JsonGetter(this.source, this.rootPath.append(path));
    }

    remove(path: Path | string): Promise<void> {
        // TODO implement
        return Promise.reject();
    }

    async size(path: Path | string): Promise<number> {
        if (typeof path === "string") path = new Path(path);
        return Object.keys(await this.getData(path)).length;
    }
}