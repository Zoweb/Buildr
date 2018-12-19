import WindowDisplay from "./WindowDisplay";
import sha1 from "sha1";

function generateInput(name, type, placeholder = "") {
    const id = sha1(`${name} (${type})`);

    const input = document.createElement("input") as HTMLInputElement;
    input.id = "input-" + id;
    input.type = type;
    input.placeholder = placeholder;

    const label = document.createElement("label") as HTMLLabelElement;
    label.htmlFor = "input-" + id;
    label.textContent = name;

    const container = document.createElement("div");
    container.id = "container-" + id;
    container.appendChild(input);
    container.appendChild(label);

    return {
        container,
        input,
        label
    };
}

export default function createLoginWindow({
    isReAuth = false,
    isRegister = false,
    forceUsername = "",
    message = null as string
                                          } = {}): Promise<{username: string, password: string}> {
    const window = new WindowDisplay(isRegister ? "Register" : "Log In", true);

    if (message) {
        if (message.length > 0) window.addMessage(message);
    } else {
        window.addMessage(isReAuth ? "We need you to log in again." : "Please enter your details below.");
    }

    const usernameField = generateInput("Username", "text", "BobRoss");
    const passwordField = generateInput("Password", "password", "••••••••••••");
    const finishButton = document.createElement("button");
    finishButton.textContent = isRegister ? "Register" : "Log in";

    window.content.appendChild(usernameField.container);
    window.content.appendChild(passwordField.container);
    window.content.appendChild(finishButton);

    if (forceUsername.length > 0) {
        usernameField.input.value = forceUsername;
        usernameField.input.disabled = true;
    }

    window.create().then(() => window.centre());

    return new Promise(yay => {
        finishButton.addEventListener("click", () => {
            window.destroy();
            yay({
                username: forceUsername.length > 0 ? forceUsername : usernameField.input.value,
                password: passwordField.input.value
            });
        });
    });
}