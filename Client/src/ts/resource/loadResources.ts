import ResourceClient from "./ResourceClient";
import LoadingIcon from "../displays/loading/LoadingIcon";

export default function loadResources(client: ResourceClient) {
    const promises = [];

    // add loading icons to all async-filled elements
    document.querySelectorAll("[async-filled]").forEach(el => {
        const expectedTime = parseInt(el.getAttribute("async-timeout")) || -1;
        const loader = new LoadingIcon(expectedTime);

        el.textContent = ""; // clear
        el.appendChild(loader.container);
    });

    document.querySelectorAll("[resource]").forEach(el => {
        // add loading icon
        const expectedTime = parseInt(el.getAttribute("async-timeout")) || -1;
        const loader = new LoadingIcon(expectedTime);
        el.textContent = "";
        el.appendChild(loader.container);

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