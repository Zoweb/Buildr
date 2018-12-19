import ParameterException from "./errors/ParameterException";

export default function nameof(obj: {[name: string]: any}) {
    const keys = Object.keys(obj);
    if (keys.length !== 1) throw new ParameterException("{variable}", obj, "obj");
    return keys[0];
}