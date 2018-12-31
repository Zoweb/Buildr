import WindowDisplay from "./WindowDisplay";
import ResourceClient from "../resource/ResourceClient";
import md5 from "md5";

export function generateInput(name, type, placeholder = "") {
    const input = document.createElement("input") as HTMLInputElement;
    input.type = type;
    input.placeholder = placeholder;

    const label = document.createElement("span") as HTMLLabelElement;
    label.classList.add("input-label");
    label.textContent = name;

    const container = document.createElement("div");

    container.appendChild(label);
    label.appendChild(input);

    label.addEventListener("mousedown", () => input.focus());

    return {
        container,
        input,
        label
    };
}

export default async function sendLoginEmail({
    isReAuth = false,
    forceEmail = null,
    client,
    extraMessages = [],
                                          }: {
    isReAuth?: boolean,
    forceEmail?: string,
    client: ResourceClient,
    extraMessages?: string[]
}): Promise<{ authCode: string }> {
    const window = new WindowDisplay("Get a magic link", true);

    window.addMessage("Type in your email and we will send you a magic link. Don't close this tab.");
    for (const message of extraMessages) {
        window.addMessage(message);
    }
    window.content.appendChild(document.createElement("br"));
    const emailField = generateInput("Email", "email", "me@example.com");

    const finishButton = document.createElement("button");
    finishButton.textContent = "Get my link";

    window.content.appendChild(emailField.container);
    window.content.appendChild(finishButton);

    await window.create();
    window.centre();

    await new Promise(yay => {
        finishButton.addEventListener("click", yay);
    });

    const sendingWindow = new WindowDisplay("Sending", true);
    sendingWindow.addMessage("The email is being sent.");

    await sendingWindow.create();
    sendingWindow.centre();

    await window.destroy();

    // send request to server
    await client.get("authentication:send-email", {
        email: emailField.input.value
    }, 20000);

    const waitWindow = new WindowDisplay("Waiting", true);
    waitWindow.addMessage("The email has been sent. Please don't close this tab.");

    await waitWindow.create();
    waitWindow.centre();

    sendingWindow.destroy();

    const {authCode} = await client.connection.once("authentication:recv-email", -1) as {authCode: string};

    // check if the user exists
    const userExists = await client.connection.get("user:exists", {
        email: emailField.input.value
    });

    if (!userExists) {
        // show register window
        const registerWindow = new WindowDisplay("Register", true);
        registerWindow.addMessage("We need some more information about you.");

        emailField.input.disabled = true;
        const usernameField = generateInput("username", "text", "ShmickMan");
        const registerButton = document.createElement("button");
        registerButton.textContent = "Register";

        const profileImage = document.createElement("img") as HTMLImageElement;
        profileImage.src = `https://www.gravatar.com/avatar/${md5(emailField.input.value)}`;
        profileImage.style.borderRadius = "7px";
        profileImage.style.marginTop = "1em";
        profileImage.style.marginLeft = "auto";
        profileImage.style.marginRight = "auto";
        profileImage.style.display = "block";

        registerWindow.content.appendChild(profileImage);
        registerWindow.content.appendChild(emailField.container);
        registerWindow.content.appendChild(usernameField.container);
        registerWindow.content.appendChild(registerButton);

        await registerWindow.create();
        registerWindow.centre();

        waitWindow.destroy();

        await new Promise(yay => registerButton.addEventListener("click", yay));

        client.setAuthCode(authCode);
        await client.get("user:update:username", {
            username: usernameField.input.value
        });

        registerWindow.destroy();
    } else waitWindow.destroy();

    return {
        authCode: authCode
    };
}