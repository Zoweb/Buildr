import {Logger} from "../getLogger";
import main from "./main";

const logger = Logger.create("page/index");
(async function() {
    const {client} = await main();

    const repoList = document.getElementById("repository-list");

    const repositories = await client.get("repository:list", {});
    repositories.forEach(item => {
        const elem = document.createElement("p");
        const href = document.createElement("a") as HTMLAnchorElement;
        href.textContent = item;
        href.href = `/repository.html#${item}`;
        elem.appendChild(href);
        repoList.appendChild(elem);
    });
})().catch(err => {
    console.error(err);
});