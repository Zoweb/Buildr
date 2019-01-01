import {Logger} from "../getLogger";
import runImports from "../imports";
import ResourceClient from "../resource/ResourceClient";
import loadResources from "../resource/loadResources";
import sendLoginEmail from "../displays/emailSendWindow";
import "@babel/polyfill";

interface Options {
    useSetupDetails?: boolean,
    doAuthentication?: boolean,
    doSetupRedirect?: boolean,
}

const logger = Logger.create("page/main");
export default async function(options: Options = {
    useSetupDetails: false,
    doAuthentication: true,
    doSetupRedirect: true
}) {
    const socketLogger = document.createElement("section");

    if (document.getElementById("socket-logger") !== null) document.getElementById("socket-logger").remove();

    socketLogger.id = "socket-logger";
    //document.body.appendChild(socketLogger);

    console.debug("Connecting to server");
    const client = new ResourceClient();
    client.connect("192.168.1.29", 6223);

    window["_enableDebugMode"] = () => {
        document.body.appendChild(socketLogger);
    };

    client.connection.onAny((event, data) => {
        if (event === "handshake") return;

        const logElem = document.createElement("div");
        logElem.className = "log-part";

        const logElemType = document.createElement("div");
        logElemType.className = "log-type";
        logElemType.textContent = "recv";

        const logElemName = document.createElement("div");
        logElemName.className = "log-name";
        logElemName.textContent = event;

        const logElemContent = document.createElement("div");
        logElemContent.className = "log-content";
        logElemContent.textContent = JSON.stringify(data);

        logElem.appendChild(logElemType);
        logElem.appendChild(logElemName);
        logElem.appendChild(logElemContent);

        socketLogger.appendChild(logElem);

        socketLogger.scrollTop = socketLogger.scrollHeight;
    });

    client.connection.onAnySend((event, data) => {
        if (event === "handshake") return;

        const logElem = document.createElement("div");
        logElem.className = "log-part";

        const logElemType = document.createElement("div");
        logElemType.className = "log-type";
        logElemType.textContent = "send";

        const logElemName = document.createElement("div");
        logElemName.className = "log-name";
        logElemName.textContent = event;

        const logElemContent = document.createElement("div");
        logElemContent.className = "log-content";
        logElemContent.textContent = JSON.stringify(data);

        logElem.appendChild(logElemType);
        logElem.appendChild(logElemName);
        logElem.appendChild(logElemContent);

        socketLogger.appendChild(logElem);

        socketLogger.scrollTop = socketLogger.scrollHeight;
    });

    console.debug("Importing linked tags.");
    await runImports();
    client.connection.on("disconnect", () => location.assign("/connection-error.html"));

    if (options.doSetupRedirect) {
        // check that there are enough users
        const userCount = await client.get("user:count");
        if (userCount < 2) location.assign("/setup.html");
    }

    if (options.doAuthentication) {
        console.debug("Will do authentication when connected.");
        client.connection.on("connect", async () => {
            console.debug("Connected, checking authentication code.");
            const {isValid: authCodeValid} = await client.get("authentication:is-valid:other", {
                authCode: localStorage.getItem("auth-code")
            });

            if (authCodeValid) {
                console.debug("Auth code is valid");
                client.setAuthCode(localStorage.getItem("auth-code"));
            } else {
                const {authCode} = await sendLoginEmail({
                    client
                });

                console.debug("Setting new auth code");
                client.setAuthCode(authCode);
                localStorage.setItem("auth-code", authCode);
            }
        });
        client.connection._emit("connect", {
            from: "client"
        });
        //client.doEmailAuthentication();
        /*client.connection.on("connect", () => {
            if (options.useSetupDetails) client.authenticate("root", "").then(result => result || location.assign("/index.html"));
            else client.doAuthentication();
        });*/

        console.debug("Waiting for authentication.");
        await client.waitUntilAuthentication();
    }

    console.debug("Getting resources");
    await loadResources(client);

    document.querySelectorAll("[data-href]").forEach(el => {
        const text = el.textContent; console.log("ELEMENT TEXT:", text);
        const href = el.getAttribute("data-href");
        el.textContent = "";
        el.removeAttribute("data-href");

        const link = document.createElement("a") as HTMLAnchorElement;
        link.href = href;
        link.textContent = text;
        el.appendChild(link);
    });

    document.getElementById("nav-account-logout").addEventListener("click", async () => {
        localStorage.removeItem("auth-code");
        await client.get("authentication:unauth", {});
        location.assign("/index.html");
    });

    return {
        client
    };
};