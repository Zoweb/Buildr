const {SHA3} = require("sha3");

const hash = new SHA3(512);
export default function sha3(input: string) {
    hash.update(input);
    const result: string = hash.digest("hex");
    hash.reset();
    return result;
}