import {Logger} from "../getLogger";
import main from "./main";
import emailSendWindow from "../displays/emailSendWindow";

const logger = Logger.create("page/setup");
(async function() {
    const {client} = await main({
        useSetupDetails: true,
        doSetupRedirect: false
    });

    // check that we haven't already set everything up
    const userCount = await client.connection.get("user:count");
    if (userCount > 1) location.assign("/index.html");

    await new Promise(yay => document.getElementById("step-1-complete").addEventListener("click", yay));

    await client.connection.get("authentication:root.set-email", {
        email: (document.getElementById("root-email") as HTMLInputElement).value
    });

    document.getElementById("step-1").remove();

    const {authCode} = await emailSendWindow({
        client,
        extraMessages: [
            "Enter your personal email",
            "Use this to log in"
        ]
    });

    client.setAuthCode(authCode);
    localStorage.setItem("auth-code", authCode);

    location.assign("/index.html");
})().catch(err => {
    console.error(err);
});