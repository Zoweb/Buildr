import IPathSection from "./IPathSection";
import ArrayPathSection from "./ArrayPathSection";
import DictionaryPathSection from "./DictionaryPathSection";

export default class Path {
    private static format = /(?:\.([a-zA-Z0-9_-]+)|(?:\[([0-9]+)]))/g;

    readonly structure: IPathSection[] = [];

    constructor(input: string = "") {
        this.structure.length = 0;

        if (input.length !== 0) this.parse(input);
    }

    private parse(inputPath: string) {
        // allow for array or didct as root by adding a "." if this is not an array
        const path = inputPath[0] !== "[" ? `.${inputPath}` : inputPath;

        let match: RegExpExecArray;
        while ((match = Path.format.exec(path)) !== null) {
            if (typeof match[1] === "undefined") {
                this.structure.push(new ArrayPathSection(parseInt(match[2])));
            } else {
                this.structure.push(new DictionaryPathSection(match[1]));
            }
        }
    }

    append(other: Path | string): Path {
        if (typeof other === "string") other = new Path(other);

        const newPath = new Path();

        newPath.structure.push(...this.structure);
        newPath.structure.push(...other.structure);

        return newPath;
    }

    toString() {
        return this.structure.map(it => it.toString()).join("");
    }
}