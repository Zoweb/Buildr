export default function createErrorFromObject(obj: {
    name?: string;
    message: string;
}) {
    const error = new Error();
    const stack = error.stack.split("\n");
    stack.splice(0, 1);
    error.stack = stack.join("\n");
    Object.assign(error, obj);
    return error;
}