import NullReferenceException from "../errors/NullReferenceException";
import nameof from "../nameof";
import {Logger} from "../getLogger";
import DatabaseGetter from "./getter/DatabaseGetter";

const logger = Logger.create("storage/getResource");

export default async function getResource(path: string, databases: {[name: string]: DatabaseGetter})  {
    if (path.indexOf(".") === -1) path += ".";

    const all = path, type = all.substr(0, all.indexOf(":")), paths = all.substr(type.length + 1);

    logger.trace(`Getting resource from ${type} -> ${paths}`);

    if (!(type in databases)) throw new NullReferenceException(type, "Database does not exist.");

    const db = databases[type];

    return await db.getAny(paths);
}