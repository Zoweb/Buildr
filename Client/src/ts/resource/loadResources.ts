import ResourceClient from "./ResourceClient";
import {Logger} from "../getLogger";

const logger = Logger.create("resource/load");

export default function loadResources(client: ResourceClient) {
    const promises = [];

    document.querySelectorAll("[resource]").forEach(el => {
        promises.push(async () => {
            const resource = el.getAttribute("resource");

            console.debug(`Loading resource for ${el.id || el.tagName} at ${resource}`);
            const content = await client.getResource(resource);
            el.textContent = content as string;
            el.removeAttribute("resource");
        });
    });

    return Promise.all(promises.map(it => it()));
}