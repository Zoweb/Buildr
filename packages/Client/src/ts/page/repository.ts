import moment from "moment";

import main from "./main";
import {
    IRepositoryGetFiles,
    IRepositoryGetFiles_File,
    RepositoryFileContents,
    RepositoryGetFiles
} from "../getter-types";
import ResourceClient from "../resource/ResourceClient";
import filesize from "file-size";
import showdown from "showdown";
import hljs from "highlight.js";
import "highlight.js/styles/a11y-light.css";
import selectElementText from "../tool/selectElementText";
import "../styling";
import "../../css/pages/repository.css";
import * as Path from "path";

const codeHighlightExtension = () => {
    function htmlunencode(text) {
        return text.replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">");
    }

    console.debug("Running code highlight extension");

    return [
        {
            type: "output",
            filter: (text, converter, options) => {
                const left = "<pre><code\\b[^>]*>",
                    right = "</code></pre>",
                    flags = "g",
                    replacement = (wholeMatch, match, left, right) => {
                        console.debug("Found match:", match);
                        match = htmlunencode(match);
                        return left + hljs.highlightAuto(match).value + right;
                    };

                return showdown.helper.replaceRecursiveRegExp(text, replacement, left, right, flags);
            }
        }
    ]
};

(async function() {
    if (location.hash.length < 5) location.assign("/index.html");

    const {client} = await main();

    const repoName = await client.get("repository:get-name", {
        assumedName: location.hash.substr(1).split("/")[0]
    }).catch(() => location.replace("/404.html"));

    console.debug("Found real repository name:", repoName);

    console.debug("Setting button URLs");
    (document.getElementById("issues-button") as HTMLAnchorElement).href = `#${repoName}/issues`;
    (document.getElementById("commits-button") as HTMLAnchorElement).href = `#${repoName}/commits`;
    (document.getElementById("branches-button") as HTMLAnchorElement).href = `#${repoName}/branches`;
    (document.getElementById("code-button") as HTMLAnchorElement).href = `#${repoName}/dir/`;

    console.debug("Getting information for repository", repoName);

    const $repoCloneUrl = document.getElementById("repository-clone-url") as HTMLInputElement;
    $repoCloneUrl.value =
        `${await client.getResource("config:host.backend.protocol")}://${await client.getResource("config:host.backend.name")}:${await client.getResource("config:host.backend.port.public")}/repository/${repoName}.git`;
    $repoCloneUrl.scrollLeft = $repoCloneUrl.scrollWidth;
    $repoCloneUrl.addEventListener("focus", () => {
        $repoCloneUrl.select();
        $repoCloneUrl.scrollLeft = $repoCloneUrl.scrollWidth;
    });

    const $repoName = document.getElementById("repository-name") as HTMLAnchorElement;
    $repoName.classList.remove("loading-icon");

    $repoName.textContent = repoName;
    $repoName.href = `#${repoName}`;

    await runPage(client, repoName);

    addEventListener("hashchange", () => runPage(client, repoName));

})().catch(err => {
    console.error(err);
});

async function runPage(client: ResourceClient, repoName: string) {
    let repoPath: string;
    if (location.hash.indexOf("/") === -1) repoPath = "";
    else repoPath = location.hash.substr(location.hash.indexOf("/"));

    repoPath = decodeURIComponent(repoPath);

    console.log("Info:", {
        repoName,
        repoPath
    });

    if (repoPath.length === 0) {
        await runFileDisplay(client, "README.md", repoName, true);
    }

    if (repoPath.startsWith("/dir/")) {
        await runDirectoryDisplay(client, repoPath.substr("/dir/".length), repoName);
    }

    if (repoPath.startsWith("/file/")) {
        await runFileDisplay(client, repoPath.substr("/file/".length), repoName, false);
    }

    if (repoPath.startsWith("/error/")) {
        await runErrorDisplay(client, repoName, repoPath.substr("/error/".length));
    }
}

async function getRepoFiles(client: ResourceClient, repoPath: string, repoName: string) {
    console.debug("Repo info:", {
        repoName,
        repoPath
    });

    const files: IRepositoryGetFiles = await client.getTyped(RepositoryGetFiles, "repository:get-files", {
        repoName,
        repoPath
    }).catch(() => location.replace("/404.html"));

    files.files.reverse();

    const fileMap: {[fileName: string]: IRepositoryGetFiles_File} = {};
    for (const log of files.files) {
        for (const file of log.files) {
            fileMap[file] = log;
        }
    }

    const everyFileList = Object.keys(fileMap).map(key => ({
        fileName: key,
        logData: fileMap[key]
    }));

    // remove things that aren't in this directory
    const localFileList = everyFileList
        .filter(it => it.fileName.startsWith(repoPath))
        .map(it => ({
            fileName: it.fileName.substr(repoPath.length),
            fullPath: it.fileName,
            logData: it.logData
        }));

    const fileList = localFileList.map(it => ({
        fileName: it.fileName,
        fullPath: it.fullPath,
        logData: it.logData,
        type: "file"
    })).filter(it => it.fileName.indexOf("/") === -1);

    const folderList = localFileList.map(it => ({
        fileName: it.fileName.slice(0, it.fileName.indexOf("/") + 1),
        fullPath: it.fullPath,
        logData: it.logData,
        type: "dir"
    })).filter(it => it.fileName.indexOf("/") > -1).reverse();

    const uniqueFolderList = folderList.filter((value, index) =>
        folderList.findIndex((it => it.fileName === value.fileName)) === index
    );

    return fileList.concat(uniqueFolderList);
}

async function runDirectoryDisplay(client: ResourceClient, repoPath: string, repoName: string) {
    const filesSection = document.getElementById("contents");

    const allFilesList = await getRepoFiles(client, repoPath, repoName);

    filesSection.textContent = "";

    if (allFilesList.length === 0) {
        const noFilesElement = document.createElement("div");
        noFilesElement.classList.add("file-link");
        noFilesElement.classList.add("info");
        noFilesElement.textContent = "No files found in the repository.";
        filesSection.appendChild(noFilesElement);
    }

    for (const file of allFilesList) {
        console.debug("File named", file.fileName, "last updated at", file.logData.authorDate);

        const fileLink = document.createElement("div");
        fileLink.className = "contents-section";

        const filename = document.createElement("a") as HTMLAnchorElement;
        filename.className = "filename";
        filename.href = `#${repoName}/${file.type}/${repoPath}${file.fileName}`;
        filename.textContent = file.fileName;

        const commit = document.createElement("a");
        commit.className = "commit";
        commit.href = `#${repoName}/commit/${file.logData.hash}`;

        const commitName = document.createElement("span");
        commitName.className = "commit-name";
        commitName.textContent = file.logData.subject;

        const commitId = document.createElement("span");
        commitId.className = "commit-id";
        commitId.textContent = file.logData.abbrevHash;

        const commitTime = document.createElement("span");
        commitTime.className = "commit-time";

        const commitRealTime = moment(file.logData.authorDate, "YYYY-MM-DD HH:mm:SS ZZ");
        commitTime.textContent = commitRealTime.fromNow();

        commit.appendChild(commitName);
        commit.appendChild(commitId);
        commit.appendChild(commitTime);

        fileLink.appendChild(filename);
        fileLink.appendChild(commit);

        filesSection.appendChild(fileLink);
    }
}

async function runFileDisplay(client: ResourceClient, path: string, repoName: string, isRoot: boolean) {
    const $contents = document.getElementById("contents");
    const $header = document.createElement("div");
    $header.className = "contents-section";

    const $headerFileName = document.createElement("span");
    $headerFileName.classList.add("filename");
    $headerFileName.classList.add("no-link");
    $headerFileName.textContent = path.indexOf("/") > -1 ? path.substr(path.lastIndexOf("/") + 1) : path;

    $header.appendChild($headerFileName);

    const files = await getRepoFiles(client, path.substr(0, path.lastIndexOf("/") + 1), repoName);

    console.log(files);

    // find this file
    const thisFile = files.find(it => it.fullPath === path && it.type === "file");

    if (typeof thisFile === "undefined") {
        // file is not found

        if (isRoot) {
            // redirect to just the directory view
            location.hash = `${repoName}/dir/`;
            return;
        }

        // display a 404 error
        location.hash = `${repoName}/error/404`;
    }

    const fileContentsResult = await client.get("repository:file-contents", {
        repository: repoName,
        hash: thisFile.logData.abbrevHash,
        file: path
    });

    const fileContents = fileContentsResult["contents"];

    const $headerFileSize = document.createElement("span");
    $headerFileSize.classList.add("file-size");
    $headerFileSize.textContent = filesize(fileContents.length).human("si");

    $header.appendChild($headerFileSize);

    const $fileContents = document.createElement("div");
    $fileContents.classList.add("contents-section");
    $fileContents.classList.add("no-padding");

    await render(client, $fileContents, path, fileContents, repoName);

    const $footer = document.createElement("div");
    $footer.classList.add("contents-section");
    $footer.textContent =
        `${await client.getResource("config:host.backend.protocol")}://${await client.getResource("config:host.backend.name")}:${await client.getResource("config:host.backend.port.public")}/rawrepo/${repoName}/${thisFile.fullPath}`;
    $footer.addEventListener("click", () => selectElementText($footer));

    $contents.textContent = "";
    $contents.appendChild($header);
    $contents.appendChild($fileContents);
    $contents.appendChild($footer);
}

async function runErrorDisplay(client: ResourceClient, name: string, type: string) {
    console.debug("An error happened, displaying page.");

    const $contents = document.getElementById("contents");
    $contents.textContent = "";

    const $section = document.createElement("div");
    $section.classList.add("contents-section");
    $contents.appendChild($section);

    const $header = document.createElement("h3");

    let headerText: string;
    switch (type) {
        case "404": headerText = "We couldn't find that."; break;

        case "500":
        default: headerText = "Something went wrong."; break;
    }
    $header.textContent = headerText;

    const $secondary = document.createElement("p");
    $secondary.classList.add("info");
    $secondary.textContent = "Try going ";

    const $secondaryLink = document.createElement("a") as HTMLAnchorElement;
    $secondaryLink.textContent = "back";
    $secondaryLink.href = "#";
    $secondaryLink.addEventListener("click", e => {
        e.preventDefault();

        history.back();
    });
    $secondary.appendChild($secondaryLink);

    $section.appendChild($header);
    $section.appendChild($secondary);
}

async function render(client: ResourceClient, output: HTMLElement, path: string, content: string, repoName: string) {
    const extension = path.substr(path.lastIndexOf(".") + 1);

    let result = "";

    console.debug("File extension:", extension);

    switch (extension) {
        case "md":
            result = await renderMarkdown(client, content, path, repoName); break;

        /*case "conf": // Apache and nginx
        case "sh": // Bash
        case "coffee": // CoffeeScript
        case "c":
        case "h":
        case "hpp":
        case "cpp": // C/C++
        case "cs": // C#
        case "css": // CSS
        case "ini":
        case "toml": // INI
        case "java": // Java
        case "js": // Javascript
        case "json": // JSON
        case "m": // Objective-C
        case "perl": */

        case "png":
        case "jpg":
        case "jpeg":
        case "tiff":
        case "tif":
        case "gif":
        case "bmp":
        case "ico":
        case "svg":
        case "webp":
            result = renderImage(content, extension, path);
            break;

        case "txt":
            result = renderText(content); break;

        default:
            result = renderCode(content); break;
    }

    output.innerHTML = result;
}

function renderText(input: string) {
    console.debug("Rendering text as plain-text");
    return `<pre>` + input.replace(/</g, "&lt;") + "</pre>";
}

async function renderMarkdown(client: ResourceClient, input: string, filename: string, repoName: string) {
    console.debug("Rendering text as markdown");
    const converter = new showdown.Converter({
        extensions: [codeHighlightExtension]
    });

    const markdownElement = document.createElement("div");
    markdownElement.innerHTML = converter.makeHtml(input);
    markdownElement.style.padding = ".6em .8em";

    // make images have correct source
    const imageSourcePromises = [];

    markdownElement.querySelectorAll("img[src]").forEach((image: HTMLImageElement) => {
        imageSourcePromises.push((async () => {
            const sourceFile = Path.normalize(
                Path.join(
                    filename.substr(0, filename.lastIndexOf("/")),
                    image.getAttribute("src")
                )
            );

            const data = await client.get("repository:file-contents", {
                repository: repoName,
                hash: "",
                file: sourceFile
            });

            image.outerHTML = renderImage(data.contents, sourceFile.substr(sourceFile.lastIndexOf(".") + 1), sourceFile);

            /*console.debug("** IMAGE SOURCE FILE:", sourceFile, "from", filename);

            let imageSource = "";

            imageSource += await client.getResource("config:host.backend.protocol") + "://";
            imageSource += await client.getResource("config:host.backend.name") + ":";
            imageSource += await client.getResource("config:host.backend.port.public");
            imageSource += "/rawrepo/";
            imageSource += repoName + "/";
            imageSource += sourceFile;

            console.debug("Updating image source to", imageSource);

            image.src = imageSource;*/


        })());
    });

    await Promise.all(imageSourcePromises);

    return markdownElement.outerHTML;
}

function renderCode(input: string) {
    console.debug("Rendering text as code");
    const element = document.createElement("pre");
    element.textContent = input;
    hljs.highlightBlock(element);
    return element.outerHTML;
}

function renderImage(input: string, extension: string, filename: string) {
    console.debug("Rendering text as image");
    console.debug("Extension:", extension, ", filename:", filename);

    const base64 = btoa(input);
    const base64Encoded = encodeURIComponent(base64);

    const mimeType = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        tiff: "image/tiff",
        tff: "image/tiff",
        gif: "image/gif",
        bmp: "image/bmp",
        ico: "image/x-icon",
        svg: "image/svg+xml",
        webp: "image/webp"
    }[extension];

    const src = `data:${mimeType};base64,${base64Encoded}`;

    return `<img src=${src} alt="${filename}" style='max-width:100%' />`
}