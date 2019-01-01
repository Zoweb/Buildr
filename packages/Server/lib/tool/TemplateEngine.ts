import {Logger} from "../getLogger";
import getResource from "../storage/getResource";
import {languagesDb, optionsDb} from "../static";
import NullReferenceException from "../errors/NullReferenceException";

const logger = Logger.create("tool/TemplateEngine");

export interface ITemplaterFunctions {
    [name: string]: (...foo: string[]) => string | Promise<string>;
}

export interface TemplaterOptions {
    start: string;
    end: string;
}

export const TemplaterFunctions: ITemplaterFunctions = {
    async resource(path) {
        return (await getResource(path, {
            lang: languagesDb,
            config: optionsDb
        })).toString();
    },
};

const defaultTemplaterOptions: TemplaterOptions = {
    start: "%",
    end: "%"
};

export default async function templater(source, data: any = {}, functions: ITemplaterFunctions = TemplaterFunctions, options: TemplaterOptions = defaultTemplaterOptions) {
    let startIndex = 0;

    let result: string[] = [];

    let currentIndex = 0;
    while ((startIndex = source.indexOf(options.start, currentIndex)) !== -1) {
        const endIndex = source.indexOf(options.end, startIndex + 1),
            content = source.substring(startIndex + 1, endIndex);

        let value: string;

        if (content.indexOf("=") === -1) {
            // this is a property
            try {
                value = content.split(".").reduce((prev, curr) => prev[curr], data);
            } catch (ex) {
                throw new NullReferenceException(content, `Could not find expected path in data: ${content}`);
            }
        } else {
            // this is a function
            const name = content.substr(0, content.indexOf("=")),
                args = content.substr(name.length + 1).split(",");

            if (typeof functions[name] === "function") {
                value = await functions[name](...args);
            } else throw new NullReferenceException(name, "Invalid function name in template");
        }

        result.push(source.substring(currentIndex, startIndex));
        result.push(value);

        //result = spliceString(source, startIndex - 1, startIndex - endIndex + 1, value);

        currentIndex = endIndex + 1;
    }

    return result.join("");
}